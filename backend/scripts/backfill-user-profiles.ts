#!/usr/bin/env ts-node
/**
 * Backfill User Profiles from Existing Conversations
 * 
 * This script analyzes all existing conversation_messages and builds
 * user profiles for phone numbers that don't have profiles yet.
 * 
 * Usage:
 *   cd /home/ubuntu/Devs/MangwaleAI/backend
 *   npx ts-node scripts/backfill-user-profiles.ts
 * 
 * Or run via Docker:
 *   docker exec -it mangwale_ai_service npx ts-node scripts/backfill-user-profiles.ts
 * 
 * NOTE: The preferred method is to use the API endpoint:
 *   curl -X POST "http://localhost:3200/api/personalization/profiles/backfill?limit=500"
 */

import { Pool } from 'pg';

interface ConversationMessage {
  session_id: string;
  sender: string;
  content: string;
  created_at: Date;
}

interface PhoneStats {
  phone: string;
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://mangwale_config:config_secure_pass_2024@localhost:5432/headless_mangwale?schema=public';

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
  });

  console.log('🔄 Starting user profile backfill...\n');

  try {
    // 1. Get all unique phone numbers from session_id (format: 91XXXXXXXXXX)
    const phonesResult = await pool.query<PhoneStats>(`
      SELECT 
        session_id as phone,
        COUNT(*) as "messageCount",
        MIN(created_at) as "firstMessage",
        MAX(created_at) as "lastMessage"
      FROM conversation_messages
      WHERE session_id ~ '^91[0-9]{10}$'
      GROUP BY session_id
      ORDER BY COUNT(*) DESC
    `);

    const phones = phonesResult.rows;
    console.log(\`📊 Found \${phones.length} unique phone numbers in conversations\n\`);

    // 2. Get existing profiles
    const existingProfilesResult = await pool.query<{ phone: string }>(\`
      SELECT phone FROM user_profiles WHERE phone IS NOT NULL
    \`);
    const existingPhones = new Set(existingProfilesResult.rows.map(r => r.phone));
    console.log(\`✅ Found \${existingPhones.size} existing profiles\n\`);

    // 3. Find phones without profiles
    const phonesNeedingProfiles = phones.filter(p => !existingPhones.has(p.phone));
    console.log(\`🎯 \${phonesNeedingProfiles.length} phone numbers need profiles\n\`);

    if (phonesNeedingProfiles.length === 0) {
      console.log('✅ All phone numbers already have profiles!');
      return;
    }

    // 4. Process each phone number
    let created = 0;
    let failed = 0;

    for (const phoneStats of phonesNeedingProfiles) {
      try {
        // Get conversation history for this phone (from session_id)
        const messagesResult = await pool.query<ConversationMessage>(\`
          SELECT session_id, sender, COALESCE(content, message_text, message) as content, created_at
          FROM conversation_messages
          WHERE session_id = $1
          ORDER BY created_at ASC
          LIMIT 50
        \`, [phoneStats.phone]);

        const messages = messagesResult.rows;

        // Skip if too few messages
        if (messages.length < 3) {
          console.log(\`⏭️ Skipping \${phoneStats.phone} (only \${messages.length} messages)\`);
          continue;
        }

        // Generate a negative user_id for guest profiles (based on phone hash)
        const phoneHash = hashString(phoneStats.phone);
        const guestUserId = -Math.abs(phoneHash % 10000000);

        // Extract basic preferences from messages using simple heuristics
        const preferences = analyzeMessagesSimple(messages);

        // Create profile
        await pool.query(\`
          INSERT INTO user_profiles (
            user_id, 
            phone, 
            dietary_type,
            dietary_restrictions,
            communication_tone,
            profile_completeness,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
          ON CONFLICT (phone) DO NOTHING
        \`, [
          guestUserId,
          phoneStats.phone,
          preferences.dietaryType,
          preferences.dietaryRestrictions,
          preferences.tone,
          preferences.completeness,
          phoneStats.firstMessage,
        ]);

        created++;
        console.log(\`✅ Created profile for \${phoneStats.phone} (\${messages.length} messages, \${preferences.completeness}% complete)\`);

      } catch (error: any) {
        failed++;
        console.error(\`❌ Failed to create profile for \${phoneStats.phone}: \${error.message}\`);
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(\`   ✅ Created: \${created} profiles\`);
    console.log(\`   ❌ Failed: \${failed} profiles\`);
    console.log(\`   ⏭️ Skipped: \${phonesNeedingProfiles.length - created - failed} (insufficient data)\`);

    // 5. Verify final count
    const finalCount = await pool.query<{ count: string }>(\`SELECT COUNT(*) as count FROM user_profiles\`);
    console.log(\`\n📈 Total profiles now: \${finalCount.rows[0].count}\`);

  } catch (error: any) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Simple string hash for generating consistent guest IDs
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Simple rule-based message analysis (no LLM needed)
function analyzeMessagesSimple(messages: ConversationMessage[]): {
  dietaryType: string | null;
  dietaryRestrictions: string[];
  tone: string;
  completeness: number;
} {
  const allText = messages.map(m => (m.content || '').toLowerCase()).join(' ');
  
  // Detect dietary type
  let dietaryType: string | null = null;
  if (allText.includes('veg') && !allText.includes('non-veg') && !allText.includes('non veg')) {
    dietaryType = 'veg';
  } else if (allText.includes('non-veg') || allText.includes('non veg') || allText.includes('chicken') || 
             allText.includes('mutton') || allText.includes('fish') || allText.includes('egg')) {
    dietaryType = 'non-veg';
  }

  // Detect dietary restrictions
  const restrictions: string[] = [];
  if (allText.includes('no onion') || allText.includes('without onion')) restrictions.push('no_onion');
  if (allText.includes('no garlic') || allText.includes('without garlic')) restrictions.push('no_garlic');
  if (allText.includes('jain')) restrictions.push('jain');
  if (allText.includes('gluten free') || allText.includes('gluten-free')) restrictions.push('gluten_free');
  if (allText.includes('no spice') || allText.includes('less spicy') || allText.includes('mild')) restrictions.push('mild');

  // Detect communication tone
  let tone = 'neutral';
  const emojiCount = (allText.match(/[😀-🙏]/g) || []).length;
  const exclamationCount = (allText.match(/!/g) || []).length;
  
  if (emojiCount > 3 || exclamationCount > 5) {
    tone = 'friendly';
  } else if (allText.includes('please') || allText.includes('thank') || allText.includes('thanks')) {
    tone = 'polite';
  } else if (allText.includes('quick') || allText.includes('urgent') || allText.includes('fast')) {
    tone = 'direct';
  }

  // Calculate completeness
  let completeness = 20; // Base
  if (dietaryType) completeness += 20;
  if (restrictions.length > 0) completeness += 15;
  if (messages.length >= 10) completeness += 15;
  if (messages.length >= 20) completeness += 10;
  if (tone !== 'neutral') completeness += 10;
  completeness = Math.min(completeness, 80); // Max 80% without LLM analysis

  return {
    dietaryType,
    dietaryRestrictions: restrictions,
    tone,
    completeness,
  };
}

main().catch(console.error);
