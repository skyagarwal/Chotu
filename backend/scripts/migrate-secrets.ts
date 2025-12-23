/**
 * Migration Script: Move API Keys from .env to Encrypted DB
 * 
 * Run with: npx ts-node scripts/migrate-secrets.ts
 * 
 * This script:
 * 1. Reads API keys from environment variables
 * 2. Encrypts them using AES-256-GCM
 * 3. Stores them in the `secrets` table
 * 
 * After migration, you can remove the API keys from .env and use:
 *   await secretsService.getSecret('groq_api_key')
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Encryption configuration
const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || 'mangwale-secrets-key-change-me!';
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// API keys to migrate
const API_KEYS_TO_MIGRATE: Array<{
  name: string;
  envVar: string;
  description: string;
  category: string;
}> = [
  // LLM Providers
  { name: 'groq_api_key', envVar: 'GROQ_API_KEY', description: 'Groq Cloud API key for LLM inference', category: 'llm' },
  { name: 'openrouter_api_key', envVar: 'OPENROUTER_API_KEY', description: 'OpenRouter API key for multi-model access', category: 'llm' },
  { name: 'openai_api_key', envVar: 'OPENAI_API_KEY', description: 'OpenAI API key', category: 'llm' },
  { name: 'together_api_key', envVar: 'TOGETHER_API_KEY', description: 'Together AI API key', category: 'llm' },
  { name: 'deepseek_api_key', envVar: 'DEEPSEEK_API_KEY', description: 'DeepSeek API key', category: 'llm' },
  { name: 'huggingface_api_key', envVar: 'HUGGINGFACE_API_KEY', description: 'HuggingFace API key', category: 'llm' },
  
  // WhatsApp
  { name: 'whatsapp_access_token', envVar: 'WHATSAPP_ACCESS_TOKEN', description: 'WhatsApp Business API access token', category: 'messaging' },
  { name: 'whatsapp_verify_token', envVar: 'WHATSAPP_VERIFY_TOKEN', description: 'WhatsApp webhook verification token', category: 'messaging' },
  
  // Google
  { name: 'google_cloud_api_key', envVar: 'GOOGLE_CLOUD_API_KEY', description: 'Google Cloud API key (TTS, Maps)', category: 'google' },
  { name: 'google_maps_api_key', envVar: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', description: 'Google Maps API key', category: 'google' },
  
  // Other Services
  { name: 'label_studio_api_key', envVar: 'LABEL_STUDIO_API_KEY', description: 'Label Studio API key for ML labeling', category: 'ml' },
  { name: 'resend_api_key', envVar: 'RESEND_API_KEY', description: 'Resend API key for email', category: 'email' },
];

async function migrateSecrets() {
  console.log('🔐 Starting secrets migration...\n');

  let migrated = 0;
  let skipped = 0;

  for (const apiKey of API_KEYS_TO_MIGRATE) {
    const envValue = process.env[apiKey.envVar];
    
    if (!envValue || envValue.trim() === '' || envValue.includes('your_') || envValue.includes('xxx')) {
      console.log(`⏭️  Skipped: ${apiKey.name} (empty or placeholder)`);
      skipped++;
      continue;
    }

    try {
      const encryptedValue = encrypt(envValue);
      
      await prisma.$executeRaw`
        INSERT INTO secrets (name, category, encrypted_value, description, is_active, created_at, updated_at)
        VALUES (${apiKey.name}, ${apiKey.category}, ${encryptedValue}, ${apiKey.description}, true, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          encrypted_value = EXCLUDED.encrypted_value,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          last_rotated = NOW(),
          updated_at = NOW()
      `;
      
      console.log(`✅ Migrated: ${apiKey.name} (${apiKey.category})`);
      migrated++;
    } catch (error) {
      console.error(`❌ Failed to migrate ${apiKey.name}:`, error.message);
    }
  }

  console.log(`\n📊 Migration complete: ${migrated} migrated, ${skipped} skipped`);
  console.log('\n⚠️  IMPORTANT: After verifying the migration, you can:');
  console.log('   1. Remove sensitive API keys from .env file');
  console.log('   2. Update code to use SecretsService.getSecret() or getSecretWithFallback()');
  console.log('   3. Set SECRETS_ENCRYPTION_KEY to a secure value in production');
}

migrateSecrets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
