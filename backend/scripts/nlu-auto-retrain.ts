#!/usr/bin/env npx ts-node
/**
 * NLU Auto-Retrain Script
 * 
 * This script runs on a schedule (e.g., daily cron) to:
 * 1. Import new conversation data into training database
 * 2. Export training data in optimal format
 * 3. Trigger retraining if enough new samples
 * 4. Deploy new model if accuracy improves
 * 
 * Usage:
 *   npx ts-node scripts/nlu-auto-retrain.ts
 *   
 * Cron (daily at 2am):
 *   0 2 * * * cd /app && npx ts-node scripts/nlu-auto-retrain.ts >> /var/log/nlu-retrain.log 2>&1
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const CONFIG = {
  TRAINING_DATA_DIR: process.env.TRAINING_DATA_DIR || '/app/training-data',
  NLU_SERVICE_URL: process.env.NLU_SERVICE_URL || 'http://localhost:7010',
  MIN_NEW_SAMPLES: 50, // Minimum new samples before retraining
  MIN_ACCURACY_IMPROVEMENT: 0.02, // Require 2% accuracy improvement
  MODEL_OUTPUT_DIR: '/app/nlu-service/models',
};

interface TrainingStats {
  total: number;
  approved: number;
  intentDistribution: Record<string, number>;
  newSinceLastTrain: number;
}

async function getTrainingStats(): Promise<TrainingStats> {
  const [total, approved, byIntent, lastTrain] = await Promise.all([
    prisma.nluTrainingData.count(),
    prisma.nluTrainingData.count({ where: { reviewStatus: 'approved' } }),
    prisma.nluTrainingData.groupBy({ by: ['intent'], _count: true }),
    getLastTrainDate(),
  ]);

  const newSinceLastTrain = await prisma.nluTrainingData.count({
    where: {
      createdAt: { gt: lastTrain },
      reviewStatus: 'approved',
    },
  });

  return {
    total,
    approved,
    intentDistribution: Object.fromEntries(byIntent.map(i => [i.intent, i._count])),
    newSinceLastTrain,
  };
}

async function getLastTrainDate(): Promise<Date> {
  // Check for marker file
  const markerFile = path.join(CONFIG.MODEL_OUTPUT_DIR, 'last_train_timestamp');
  if (fs.existsSync(markerFile)) {
    const timestamp = fs.readFileSync(markerFile, 'utf-8').trim();
    return new Date(timestamp);
  }
  // Default to 7 days ago if no marker
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

async function importFromConversations(): Promise<number> {
  // Import from conversation_messages table
  const messages = await prisma.$queryRaw<Array<{
    message: string;
    intent: string;
    confidence: number;
    session_id: string;
    platform: string;
  }>>`
    SELECT DISTINCT ON (message) 
      message, intent, confidence, session_id, platform
    FROM conversation_messages 
    WHERE sender = 'user' 
      AND message IS NOT NULL 
      AND intent IS NOT NULL
      AND LENGTH(message) > 3
      AND message NOT IN (SELECT text FROM nlu_training_data)
    ORDER BY message, created_at DESC
    LIMIT 1000
  `;

  let imported = 0;
  for (const msg of messages) {
    try {
      await prisma.nluTrainingData.create({
        data: {
          text: msg.message,
          intent: msg.intent,
          confidence: msg.confidence || 0.5,
          source: `chat-${msg.platform || 'unknown'}`,
          reviewStatus: msg.confidence >= 0.95 ? 'approved' : 'pending',
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

  console.log(`📥 Imported ${imported} new samples from conversation_messages`);
  return imported;
}

async function exportTrainingData(): Promise<string> {
  const samples = await prisma.nluTrainingData.findMany({
    where: { reviewStatus: 'approved' },
    select: { text: true, intent: true },
    orderBy: { createdAt: 'desc' },
  });

  const filepath = path.join(CONFIG.TRAINING_DATA_DIR, 'training_data.jsonl');
  const lines = samples.map(s => JSON.stringify({ text: s.text, intent: s.intent }));
  fs.writeFileSync(filepath, lines.join('\n'));

  console.log(`📤 Exported ${samples.length} approved samples to ${filepath}`);
  return filepath;
}

async function triggerTraining(): Promise<{ accuracy: number; modelPath: string } | null> {
  try {
    // Call NLU service training endpoint
    const response = await fetch(`${CONFIG.NLU_SERVICE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataPath: path.join(CONFIG.TRAINING_DATA_DIR, 'training_data.jsonl'),
        epochs: 10,
        batchSize: 16,
      }),
    });

    if (!response.ok) {
      console.error(`❌ Training failed: ${await response.text()}`);
      return null;
    }

    const result = await response.json();
    console.log(`🎯 Training complete: accuracy=${result.accuracy}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Training error: ${error}`);
    return null;
  }
}

async function getCurrentAccuracy(): Promise<number> {
  try {
    const response = await fetch(`${CONFIG.NLU_SERVICE_URL}/healthz`);
    const health = await response.json();
    return health.model_accuracy || 0.5;
  } catch {
    return 0.5;
  }
}

async function updateTrainMarker(): Promise<void> {
  const markerFile = path.join(CONFIG.MODEL_OUTPUT_DIR, 'last_train_timestamp');
  fs.writeFileSync(markerFile, new Date().toISOString());
}

async function main(): Promise<void> {
  console.log('\n🚀 NLU Auto-Retrain Script Started');
  console.log('=' .repeat(50));
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Import new conversations
    console.log('\n📥 Step 1: Importing from conversation_messages...');
    const imported = await importFromConversations();

    // Step 2: Get training stats
    console.log('\n📊 Step 2: Analyzing training data...');
    const stats = await getTrainingStats();
    console.log(`   Total samples: ${stats.total}`);
    console.log(`   Approved samples: ${stats.approved}`);
    console.log(`   New since last train: ${stats.newSinceLastTrain}`);
    console.log(`   Intent distribution: ${Object.keys(stats.intentDistribution).length} intents`);

    // Step 3: Check if retraining needed
    if (stats.newSinceLastTrain < CONFIG.MIN_NEW_SAMPLES) {
      console.log(`\n⏸️  Not enough new samples (${stats.newSinceLastTrain}/${CONFIG.MIN_NEW_SAMPLES}). Skipping retraining.`);
      await prisma.$disconnect();
      return;
    }

    // Step 4: Export training data
    console.log('\n📤 Step 3: Exporting training data...');
    await exportTrainingData();

    // Step 5: Get current accuracy
    const currentAccuracy = await getCurrentAccuracy();
    console.log(`   Current model accuracy: ${(currentAccuracy * 100).toFixed(1)}%`);

    // Step 6: Train new model
    console.log('\n🏋️ Step 4: Training new model...');
    const trainResult = await triggerTraining();

    if (trainResult) {
      const improvement = trainResult.accuracy - currentAccuracy;
      console.log(`   New accuracy: ${(trainResult.accuracy * 100).toFixed(1)}%`);
      console.log(`   Improvement: ${(improvement * 100).toFixed(1)}%`);

      if (improvement >= CONFIG.MIN_ACCURACY_IMPROVEMENT) {
        console.log('\n✅ Model improved! Deploying...');
        await updateTrainMarker();
      } else if (improvement > 0) {
        console.log('\n⚠️  Minor improvement. Model saved but not deployed.');
      } else {
        console.log('\n❌ No improvement. Keeping existing model.');
      }
    }

    console.log('\n🏁 Auto-retrain complete!');

  } catch (error) {
    console.error('\n❌ Error in auto-retrain:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runAutoRetrain };
