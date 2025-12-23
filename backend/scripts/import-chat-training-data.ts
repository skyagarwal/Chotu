/**
 * Import Chat Training Data Script
 * 
 * This script imports conversation data from conversation_messages table
 * into the nlu_training_data table for model improvement.
 * 
 * Run with: npx ts-node scripts/import-chat-training-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Intent mapping to normalize/clean up intents
const INTENT_MAPPING: Record<string, string> = {
  'order_food': 'order_food',
  'parcel_booking': 'parcel_booking',
  'create_parcel_order': 'parcel_booking',
  'manage_address': 'manage_address',
  'greeting': 'greeting',
  'track_order': 'track_order',
  'check_order_status': 'track_order',
  'cancel_order': 'cancel_order',
  'add_to_cart': 'add_to_cart',
  'browse_menu': 'browse_menu',
  'search_product': 'search_product',
  'checkout': 'checkout',
  'repeat_order': 'repeat_order',
  'help': 'help',
  'service_inquiry': 'service_inquiry',
  'support_request': 'support_request',
  'complaint': 'complaint',
  'chitchat': 'chitchat',
  'thanks': 'thanks',
  'confirm': 'confirm',
  'login': 'login',
  'earn': 'earn',
  'play_game': 'play_game',
  'use_my_details': 'use_my_details',
  'contact_search': 'contact_search',
};

// Messages to ignore (common short/spam messages)
const IGNORE_PATTERNS = [
  /^[0-9]{4,}$/,                    // OTP codes
  /^[0-9.,\s+-]+$/,                 // Just numbers/coordinates
  /^https?:\/\//,                   // URLs
  /^[a-zA-Z0-9._%+-]+@/,           // Emails
  /^\+?[0-9\s]{10,}$/,              // Phone numbers
  /^(hi|hello|hey|ok|yes|no|bye|thanks?)$/i,
  /^aaaa+/i,                        // Spam
  /@#\$%/,                          // Special char spam
];

async function importChatData() {
  console.log('🚀 Starting chat training data import...\n');

  try {
    // Get unique messages with valid intents from conversation_messages
    const rawMessages = await prisma.conversationMessage.findMany({
      where: {
        sender: 'user',
        intent: {
          not: null,
          notIn: ['unknown', 'feedback_v1'],
        },
      },
      select: {
        message: true,
        intent: true,
        confidence: true,
        sessionId: true,
      },
      distinct: ['message', 'intent'],
    });

    console.log(`📊 Found ${rawMessages.length} raw messages from conversations\n`);

    // Filter and deduplicate
    const validMessages = rawMessages.filter(msg => {
      const text = msg.message?.trim();
      if (!text || text.length < 4) return false;
      if (text.length > 500) return false;
      
      // Check ignore patterns
      for (const pattern of IGNORE_PATTERNS) {
        if (pattern.test(text)) return false;
      }
      
      return true;
    });

    console.log(`✅ ${validMessages.length} messages passed validation\n`);

    // Track stats
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const intentCounts: Record<string, number> = {};

    for (const msg of validMessages) {
      const text = msg.message?.trim();
      const rawIntent = msg.intent;
      
      if (!text || !rawIntent) {
        skipped++;
        continue;
      }

      // Normalize intent
      const normalizedIntent = INTENT_MAPPING[rawIntent] || rawIntent;
      
      try {
        // Check if already exists
        const existing = await prisma.nluTrainingData.findUnique({
          where: { text },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Determine review status based on confidence
        const confidence = msg.confidence || 0.8;
        const reviewStatus = confidence >= 0.95 ? 'approved' : 
                            confidence >= 0.80 ? 'pending' : 'pending';

        // Insert into nlu_training_data
        await prisma.nluTrainingData.create({
          data: {
            text,
            intent: normalizedIntent,
            entities: {},
            confidence,
            source: 'nlu',
            reviewStatus,
            language: 'auto',
            sessionId: msg.sessionId,
          },
        });

        imported++;
        intentCounts[normalizedIntent] = (intentCounts[normalizedIntent] || 0) + 1;

        if (imported % 50 === 0) {
          console.log(`  📝 Imported ${imported} samples...`);
        }
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Duplicate - skip
          skipped++;
        } else {
          errors++;
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped (duplicates/invalid): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('\n📈 Intent Distribution:');
    
    const sortedIntents = Object.entries(intentCounts)
      .sort(([,a], [,b]) => b - a);
    
    for (const [intent, count] of sortedIntents) {
      console.log(`  ${intent}: ${count}`);
    }

    // Get total counts
    const totalApproved = await prisma.nluTrainingData.count({
      where: { reviewStatus: 'approved' },
    });
    const totalPending = await prisma.nluTrainingData.count({
      where: { reviewStatus: 'pending' },
    });

    console.log('\n📦 Database Status:');
    console.log(`  Approved samples: ${totalApproved}`);
    console.log(`  Pending review: ${totalPending}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importChatData();
