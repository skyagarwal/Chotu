/**
 * Database-Driven Intent Manager
 * 
 * Loads intent definitions from the database instead of hardcoded patterns.
 * This enables:
 * - Runtime intent updates without code changes
 * - A/B testing different intent patterns
 * - Admin UI for intent management
 * - Automatic learning from conversation logs
 * 
 * Intent Definition Schema (from Prisma):
 * - id: string
 * - name: string (unique intent identifier)
 * - description: string
 * - examples: string[] (training examples that also serve as patterns)
 * - slots: Json (parameters/entities to extract)
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

// Intent definition from database
export interface IntentDefinition {
  id: string;
  name: string;
  description?: string;
  examples: string[];
  slots?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Compiled pattern for faster matching
interface CompiledPattern {
  intentName: string;
  pattern: string;
  regex: RegExp;
  description?: string;
}

// Intent match result
export interface IntentMatch {
  intent: string;
  confidence: number;
  matchedPattern?: string;
  source: 'database' | 'fallback';
}

@Injectable()
export class IntentManagerService implements OnModuleInit {
  private readonly logger = new Logger(IntentManagerService.name);
  
  // Compiled patterns cache
  private compiledPatterns: CompiledPattern[] = [];
  
  // Last refresh timestamp
  private lastRefresh: Date = new Date(0);
  
  // Refresh interval (5 minutes)
  private readonly refreshInterval = 5 * 60 * 1000;
  
  // Is using fallback patterns
  private usingFallback = false;
  
  // Fallback patterns (used when database is empty)
  private readonly fallbackPatterns: Record<string, { patterns: RegExp[]; module: string }> = {
    greeting: {
      patterns: [/^(hi|hello|hey|namaste|good morning|good afternoon)/i],
      module: 'general',
    },
    track_order: {
      patterns: [/track.*order/i, /where.*order/i, /order.*status/i, /delivery.*status/i],
      module: 'order',
    },
    parcel_booking: {
      patterns: [/send.*parcel/i, /book.*parcel/i, /courier/i, /package.*delivery/i],
      module: 'parcel',
    },
    search_product: {
      patterns: [/search/i, /find/i, /looking for/i, /show me/i],
      module: 'search',
    },
    cancel_order: {
      patterns: [/cancel.*order/i, /cancel/i],
      module: 'order',
    },
    help: {
      patterns: [/help/i, /support/i, /problem/i, /issue/i],
      module: 'general',
    },
    complaint: {
      patterns: [/complain/i, /refund/i, /wrong.*item/i, /damaged/i],
      module: 'complaints',
    },
    order_food: {
      patterns: [/order.*food/i, /hungry/i, /eat/i, /pizza/i, /burger/i, /biryani/i, /paneer/i, /menu/i],
      module: 'food',
    },
    login: {
      patterns: [/login/i, /sign in/i, /auth/i, /register/i, /signup/i],
      module: 'auth',
    },
  };
  
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}
  
  async onModuleInit() {
    this.logger.log('🧠 Initializing Database-Driven Intent Manager...');
    await this.refreshIntents();
    this.logger.log(`✅ Loaded ${this.compiledPatterns.length} intent patterns (fallback: ${this.usingFallback})`);
  }
  
  /**
   * Refresh intents from database
   */
  async refreshIntents(): Promise<void> {
    try {
      const intents = await this.prisma.intentDefinition.findMany({
        orderBy: { name: 'asc' },
      });
      
      if (intents.length === 0) {
        this.logger.warn('No intents in database, using fallback patterns');
        this.compileFromFallback();
        return;
      }
      
      this.compiledPatterns = [];
      this.usingFallback = false;
      
      for (const intent of intents) {
        // Use examples as patterns
        const examples = intent.examples || [];
        
        for (const example of examples) {
          try {
            // Convert example to a fuzzy regex pattern
            // Escape special chars and make it a loose match
            const escaped = example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const loosePattern = escaped.split(/\s+/).join('.*');
            
            this.compiledPatterns.push({
              intentName: intent.name,
              pattern: example,
              regex: new RegExp(loosePattern, 'i'),
              description: intent.description || undefined,
            });
          } catch (regexError) {
            this.logger.warn(`Invalid pattern for intent ${intent.name}: ${example}`);
          }
        }
      }
      
      this.lastRefresh = new Date();
      this.logger.debug(`Refreshed ${this.compiledPatterns.length} intent patterns from database`);
      
    } catch (error) {
      this.logger.error(`Failed to refresh intents from database: ${error.message}`);
      
      // Fall back to hardcoded patterns
      if (this.compiledPatterns.length === 0) {
        this.compileFromFallback();
      }
    }
  }
  
  /**
   * Compile patterns from fallback (hardcoded)
   */
  private compileFromFallback(): void {
    this.compiledPatterns = [];
    this.usingFallback = true;
    
    for (const [intentName, config] of Object.entries(this.fallbackPatterns)) {
      for (const pattern of config.patterns) {
        this.compiledPatterns.push({
          intentName,
          pattern: pattern.source,
          regex: pattern,
        });
      }
    }
    
    this.logger.log(`Compiled ${this.compiledPatterns.length} fallback patterns`);
  }
  
  /**
   * Match text against intent patterns
   */
  matchIntent(text: string): IntentMatch {
    const lowerText = text.toLowerCase().trim();
    
    // Check each pattern
    for (const pattern of this.compiledPatterns) {
      if (pattern.regex.test(lowerText)) {
        // Calculate confidence based on match quality
        let confidence = 0.7;
        
        // Boost confidence for exact word matches
        const words = lowerText.split(/\s+/);
        const patternWords = pattern.pattern.toLowerCase().split(/\s+/);
        const matchedWords = patternWords.filter(pw => words.some(w => w.includes(pw) || pw.includes(w)));
        
        if (matchedWords.length > 0) {
          confidence = Math.min(0.95, 0.7 + (matchedWords.length / patternWords.length) * 0.25);
        }
        
        return {
          intent: pattern.intentName,
          confidence,
          matchedPattern: pattern.pattern,
          source: this.usingFallback ? 'fallback' : 'database',
        };
      }
    }
    
    // No match found
    return {
      intent: 'unknown',
      confidence: 0.3,
      source: 'fallback',
    };
  }
  
  /**
   * Get all available intents
   */
  async getAvailableIntents(): Promise<string[]> {
    // Force refresh if needed
    if (Date.now() - this.lastRefresh.getTime() > this.refreshInterval) {
      await this.refreshIntents();
    }
    
    const intentSet = new Set(this.compiledPatterns.map(p => p.intentName));
    return Array.from(intentSet);
  }
  
  /**
   * Get intent details
   */
  async getIntentDetails(intentName: string): Promise<IntentDefinition | null> {
    const intent = await this.prisma.intentDefinition.findFirst({
      where: { name: intentName },
    });
    
    if (!intent) return null;
    
    return {
      id: intent.id,
      name: intent.name,
      description: intent.description || undefined,
      examples: intent.examples || [],
      slots: intent.slots as Record<string, any> || undefined,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt,
    };
  }
  
  /**
   * Add new intent
   */
  async addIntent(data: { name: string; description?: string; examples: string[]; slots?: Record<string, any> }): Promise<IntentDefinition> {
    const intent = await this.prisma.intentDefinition.create({
      data: {
        name: data.name,
        description: data.description,
        examples: data.examples,
        slots: data.slots,
      },
    });
    
    // Refresh patterns cache
    await this.refreshIntents();
    
    return {
      id: intent.id,
      name: intent.name,
      description: intent.description || undefined,
      examples: intent.examples || [],
      slots: intent.slots as Record<string, any> || undefined,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt,
    };
  }
  
  /**
   * Update intent
   */
  async updateIntent(id: string, data: Partial<{ name: string; description?: string; examples: string[]; slots?: Record<string, any> }>): Promise<IntentDefinition | null> {
    try {
      const intent = await this.prisma.intentDefinition.update({
        where: { id },
        data,
      });
      
      // Refresh patterns cache
      await this.refreshIntents();
      
      return {
        id: intent.id,
        name: intent.name,
        description: intent.description || undefined,
        examples: intent.examples || [],
        slots: intent.slots as Record<string, any> || undefined,
        createdAt: intent.createdAt,
        updatedAt: intent.updatedAt,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Delete intent
   */
  async deleteIntent(id: string): Promise<boolean> {
    try {
      await this.prisma.intentDefinition.delete({
        where: { id },
      });
      
      // Refresh patterns cache
      await this.refreshIntents();
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Learn new examples from conversation logs (auto-learning)
   * This analyzes successful conversations to suggest new examples
   */
  async suggestExamples(intentName: string): Promise<string[]> {
    // Get conversation logs where this intent was correctly classified
    const logs = await this.prisma.conversationLog.findMany({
      where: {
        nluIntent: intentName,
        nluConfidence: { gte: 0.8 },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    
    // Return unique messages as suggestions
    const suggestions = [...new Set(logs.map(l => l.userMessage))];
    return suggestions.slice(0, 20); // Limit to 20 suggestions
  }
  
  /**
   * Get statistics on intent usage
   */
  async getIntentStats(): Promise<Record<string, { count: number; avgConfidence: number }>> {
    const logs = await this.prisma.conversationLog.groupBy({
      by: ['nluIntent'],
      _count: true,
      _avg: {
        nluConfidence: true,
      },
      where: {
        nluIntent: { not: null },
      },
    });
    
    const stats: Record<string, { count: number; avgConfidence: number }> = {};
    
    for (const log of logs) {
      if (log.nluIntent) {
        stats[log.nluIntent] = {
          count: log._count,
          avgConfidence: Number(log._avg.nluConfidence) || 0,
        };
      }
    }
    
    return stats;
  }
  
  /**
   * Bulk import intents from JSON
   */
  async bulkImportIntents(intents: Array<{ name: string; description?: string; examples: string[]; slots?: Record<string, any> }>): Promise<number> {
    let imported = 0;
    
    for (const intent of intents) {
      try {
        await this.prisma.intentDefinition.upsert({
          where: { name: intent.name },
          create: {
            name: intent.name,
            description: intent.description,
            examples: intent.examples,
            slots: intent.slots,
          },
          update: {
            description: intent.description,
            examples: intent.examples,
            slots: intent.slots,
          },
        });
        imported++;
      } catch (error) {
        this.logger.warn(`Failed to import intent ${intent.name}: ${error.message}`);
      }
    }
    
    // Refresh patterns cache
    await this.refreshIntents();
    
    return imported;
  }
  
  /**
   * Export all intents to JSON
   */
  async exportIntents(): Promise<IntentDefinition[]> {
    const intents = await this.prisma.intentDefinition.findMany({
      orderBy: { name: 'asc' },
    });
    
    return intents.map(intent => ({
      id: intent.id,
      name: intent.name,
      description: intent.description || undefined,
      examples: intent.examples || [],
      slots: intent.slots as Record<string, any> || undefined,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt,
    }));
  }
}
