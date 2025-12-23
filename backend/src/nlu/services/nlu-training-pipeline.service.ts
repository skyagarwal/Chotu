import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NLU Training Pipeline Service
 * 
 * Comprehensive training data management for IndicBERT:
 * 1. Collects data from ALL channels (WhatsApp, Web, Telegram, Voice, SMS)
 * 2. Captures ALL NLU outputs (intent, entities, tone, embedding)
 * 3. Exports in optimal format for retraining
 * 4. Tracks data quality metrics
 * 
 * Entity Types for SLOTS_MODEL training:
 * - product_name, restaurant_name, quantity, phone, email
 * - location, order_id, date, time, price, person_name
 * 
 * Tone Types for TONE_MODEL training:
 * - happy, angry, urgent, neutral, frustrated, polite, confused
 */
@Injectable()
export class NluTrainingPipelineService implements OnModuleInit {
  private readonly logger = new Logger(NluTrainingPipelineService.name);
  private readonly TRAINING_DATA_DIR = '/app/training-data';
  
  // Data quality thresholds
  private readonly MIN_SAMPLES_PER_INTENT = 100;
  private readonly MIN_CONFIDENCE_FOR_AUTO_APPROVE = 0.95;
  private readonly MIN_SAMPLES_FOR_ENTITY = 50;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure training data directory exists
    if (!fs.existsSync(this.TRAINING_DATA_DIR)) {
      fs.mkdirSync(this.TRAINING_DATA_DIR, { recursive: true });
    }
    
    // Log data stats on startup
    const stats = await this.getTrainingDataStats();
    this.logger.log(`📊 Training Data Stats: ${JSON.stringify(stats)}`);
  }

  /**
   * Get comprehensive training data statistics
   */
  async getTrainingDataStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    intentDistribution: Record<string, number>;
    entityDistribution: Record<string, number>;
    toneDistribution: Record<string, number>;
    languageDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
    intentGaps: string[]; // Intents with < MIN_SAMPLES
  }> {
    const [total, byStatus, byIntent, bySource, byLanguage] = await Promise.all([
      this.prisma.nluTrainingData.count(),
      this.prisma.nluTrainingData.groupBy({
        by: ['reviewStatus'],
        _count: true,
      }),
      this.prisma.nluTrainingData.groupBy({
        by: ['intent'],
        _count: true,
      }),
      this.prisma.nluTrainingData.groupBy({
        by: ['source'],
        _count: true,
      }),
      this.prisma.nluTrainingData.groupBy({
        by: ['language'],
        _count: true,
      }),
    ]);

    const intentDistribution: Record<string, number> = {};
    const intentGaps: string[] = [];
    
    for (const item of byIntent) {
      intentDistribution[item.intent] = item._count;
      if (item._count < this.MIN_SAMPLES_PER_INTENT) {
        intentGaps.push(`${item.intent} (${item._count}/${this.MIN_SAMPLES_PER_INTENT})`);
      }
    }

    // Count entity types from stored entities
    const entityDistribution: Record<string, number> = {};
    const toneDistribution: Record<string, number> = {};
    
    const samples = await this.prisma.nluTrainingData.findMany({
      select: { entities: true, tone: true },
      take: 10000,
    });
    
    for (const sample of samples) {
      // Count entities
      if (sample.entities && typeof sample.entities === 'object') {
        for (const key of Object.keys(sample.entities as object)) {
          entityDistribution[key] = (entityDistribution[key] || 0) + 1;
        }
      }
      
      // Count tones
      if (sample.tone) {
        toneDistribution[sample.tone] = (toneDistribution[sample.tone] || 0) + 1;
      }
    }

    const statusMap: Record<string, number> = {};
    for (const item of byStatus) {
      statusMap[item.reviewStatus] = item._count;
    }

    return {
      total,
      approved: statusMap['approved'] || 0,
      pending: statusMap['pending'] || 0,
      rejected: statusMap['rejected'] || 0,
      intentDistribution,
      entityDistribution,
      toneDistribution,
      languageDistribution: Object.fromEntries(byLanguage.map(l => [l.language, l._count])),
      sourceDistribution: Object.fromEntries(bySource.map(s => [s.source, s._count])),
      intentGaps,
    };
  }

  /**
   * Export training data for intent classification
   */
  async exportIntentTrainingData(options?: {
    onlyApproved?: boolean;
    minConfidence?: number;
    format?: 'jsonl' | 'csv';
  }): Promise<string> {
    const where: any = {};
    
    if (options?.onlyApproved) {
      where.reviewStatus = 'approved';
    }
    if (options?.minConfidence) {
      where.confidence = { gte: options.minConfidence };
    }

    const samples = await this.prisma.nluTrainingData.findMany({
      where,
      select: { text: true, intent: true, language: true, confidence: true },
      orderBy: { createdAt: 'desc' },
    });

    const filename = `intent_training_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.TRAINING_DATA_DIR, filename);
    
    const lines = samples.map(s => JSON.stringify({
      text: s.text,
      intent: s.intent,
      language: s.language,
      confidence: s.confidence,
    }));
    
    fs.writeFileSync(filepath, lines.join('\n'));
    this.logger.log(`📤 Exported ${samples.length} samples to ${filepath}`);
    
    return filepath;
  }

  /**
   * Export training data for entity extraction (SLOTS_MODEL)
   */
  async exportEntityTrainingData(): Promise<string> {
    const samples = await this.prisma.nluTrainingData.findMany({
      where: {
        reviewStatus: { in: ['approved', 'pending'] },
        NOT: { entities: { equals: {} } },
      },
      select: { text: true, intent: true, entities: true, language: true },
    });

    // Convert to BIO format for token classification
    const bioSamples: Array<{ tokens: string[]; tags: string[] }> = [];
    
    for (const sample of samples) {
      const entities = sample.entities as Record<string, any>;
      if (!entities || Object.keys(entities).length === 0) continue;

      const tokens = sample.text.split(/\s+/);
      const tags = tokens.map(() => 'O');

      for (const [entityType, entityValue] of Object.entries(entities)) {
        if (typeof entityValue === 'string') {
          const entityTokens = entityValue.toLowerCase().split(/\s+/);
          const textLower = sample.text.toLowerCase();
          const startIdx = textLower.indexOf(entityValue.toLowerCase());
          
          if (startIdx >= 0) {
            // Find token positions
            let charPos = 0;
            for (let i = 0; i < tokens.length; i++) {
              if (charPos >= startIdx && charPos < startIdx + entityValue.length) {
                tags[i] = i === Math.floor(startIdx / (charPos / (i + 1))) ? `B-${entityType}` : `I-${entityType}`;
              }
              charPos += tokens[i].length + 1;
            }
          }
        }
      }

      bioSamples.push({ tokens, tags });
    }

    const filename = `entity_training_bio_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.TRAINING_DATA_DIR, filename);
    
    const lines = bioSamples.map(s => JSON.stringify(s));
    fs.writeFileSync(filepath, lines.join('\n'));
    this.logger.log(`📤 Exported ${bioSamples.length} entity samples to ${filepath}`);
    
    return filepath;
  }

  /**
   * Export training data for tone classification (TONE_MODEL)
   */
  async exportToneTrainingData(): Promise<string> {
    const samples = await this.prisma.nluTrainingData.findMany({
      where: {
        reviewStatus: { in: ['approved', 'pending'] },
        tone: { not: null },
      },
      select: { text: true, tone: true, language: true },
    });

    const filename = `tone_training_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.TRAINING_DATA_DIR, filename);
    
    const lines = samples.map(s => JSON.stringify({
      text: s.text,
      tone: s.tone,
      language: s.language,
    }));
    
    fs.writeFileSync(filepath, lines.join('\n'));
    this.logger.log(`📤 Exported ${samples.length} tone samples to ${filepath}`);
    
    return filepath;
  }

  /**
   * Merge conversation_messages into nlu_training_data
   * This captures ALL chat data for training
   */
  async importFromConversationMessages(): Promise<number> {
    // Get recent user messages not yet in training data
    const messages = await this.prisma.$queryRaw<Array<{
      message: string;
      intent: string;
      confidence: number;
      session_id: string;
    }>>`
      SELECT DISTINCT ON (message) 
        message, intent, confidence, session_id
      FROM conversation_messages 
      WHERE sender = 'user' 
        AND message IS NOT NULL 
        AND intent IS NOT NULL
        AND message NOT IN (SELECT text FROM nlu_training_data)
      ORDER BY message, created_at DESC
      LIMIT 1000
    `;

    let imported = 0;
    for (const msg of messages) {
      try {
        await this.prisma.nluTrainingData.create({
          data: {
            text: msg.message,
            intent: msg.intent,
            confidence: msg.confidence || 0.5,
            source: 'chat-import',
            reviewStatus: msg.confidence >= this.MIN_CONFIDENCE_FOR_AUTO_APPROVE ? 'approved' : 'pending',
            language: 'auto',
            sessionId: msg.session_id,
            entities: {},
          },
        });
        imported++;
      } catch (error) {
        // Ignore duplicates
      }
    }

    this.logger.log(`📥 Imported ${imported} new samples from conversation_messages`);
    return imported;
  }

  /**
   * Auto-approve high-confidence samples
   */
  async autoApproveSamples(): Promise<number> {
    const result = await this.prisma.nluTrainingData.updateMany({
      where: {
        reviewStatus: 'pending',
        confidence: { gte: this.MIN_CONFIDENCE_FOR_AUTO_APPROVE },
      },
      data: {
        reviewStatus: 'approved',
      },
    });

    this.logger.log(`✅ Auto-approved ${result.count} high-confidence samples`);
    return result.count;
  }

  /**
   * Generate synthetic training data for underrepresented intents
   */
  async generateSyntheticData(intent: string, count: number = 20): Promise<number> {
    // Get existing samples for this intent
    const existing = await this.prisma.nluTrainingData.findMany({
      where: { intent },
      select: { text: true },
      take: 50,
    });

    if (existing.length === 0) {
      this.logger.warn(`No existing samples for intent ${intent}`);
      return 0;
    }

    // Simple augmentation: paraphrase patterns
    const augmentations = [
      (text: string) => text.replace(/please/gi, 'kindly'),
      (text: string) => text.replace(/want/gi, 'need'),
      (text: string) => text.replace(/show/gi, 'display'),
      (text: string) => `${text} please`,
      (text: string) => `can you ${text.toLowerCase()}`,
      (text: string) => `I would like to ${text.toLowerCase()}`,
    ];

    let generated = 0;
    for (const sample of existing.slice(0, Math.ceil(count / augmentations.length))) {
      for (const augment of augmentations) {
        if (generated >= count) break;
        
        const newText = augment(sample.text);
        if (newText !== sample.text && newText.length > 5) {
          try {
            await this.prisma.nluTrainingData.create({
              data: {
                text: newText,
                intent,
                confidence: 0.7,
                source: 'synthetic',
                reviewStatus: 'pending',
                language: 'en',
                entities: {},
              },
            });
            generated++;
          } catch (error) {
            // Ignore duplicates
          }
        }
      }
    }

    this.logger.log(`🔄 Generated ${generated} synthetic samples for ${intent}`);
    return generated;
  }

  /**
   * Get recommendations for improving training data
   */
  async getTrainingRecommendations(): Promise<{
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
    actions: Array<{ action: string; command: string }>;
  }> {
    const stats = await this.getTrainingDataStats();
    const recommendations: string[] = [];
    const actions: Array<{ action: string; command: string }> = [];
    let priority: 'high' | 'medium' | 'low' = 'low';

    // Check total samples
    if (stats.total < 500) {
      recommendations.push(`Total samples (${stats.total}) is very low. Need at least 500 for basic accuracy.`);
      actions.push({ action: 'Import from chat logs', command: 'npm run training:import-chats' });
      priority = 'high';
    }

    // Check intent gaps
    if (stats.intentGaps.length > 0) {
      recommendations.push(`${stats.intentGaps.length} intents have fewer than ${this.MIN_SAMPLES_PER_INTENT} samples: ${stats.intentGaps.slice(0, 5).join(', ')}`);
      actions.push({ action: 'Generate synthetic data', command: 'npm run training:generate-synthetic' });
      if (priority === 'low') priority = 'medium';
    }

    // Check pending reviews
    if (stats.pending > 50) {
      recommendations.push(`${stats.pending} samples pending review. Consider setting up Label Studio.`);
      actions.push({ action: 'Auto-approve high-confidence', command: 'npm run training:auto-approve' });
    }

    // Check entity diversity
    const entityTypes = Object.keys(stats.entityDistribution).length;
    if (entityTypes < 5) {
      recommendations.push(`Only ${entityTypes} entity types captured. Enhanced EntityExtractor should capture more.`);
    }

    // Check tone diversity  
    const toneTypes = Object.keys(stats.toneDistribution).length;
    if (toneTypes < 4) {
      recommendations.push(`Only ${toneTypes} tone types captured. Need more diverse conversations.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Training data looks healthy! Consider retraining for improved accuracy.');
      actions.push({ action: 'Export and retrain', command: 'npm run training:export && npm run training:train' });
    }

    return { priority, recommendations, actions };
  }
}
