/**
 * Seed Exotel Configuration Settings
 * 
 * Run with: npx ts-node scripts/seed-exotel-settings.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Exotel configuration settings...');

  const exotelSettings = [
    // Connection settings
    { key: 'exotel.service_url', value: 'http://192.168.0.151:3100', category: 'exotel', description: 'Exotel Mercury service URL' },
    { key: 'exotel.api_key', value: '', category: 'exotel', description: 'Exotel API Key' },
    { key: 'exotel.api_token', value: '', category: 'exotel', description: 'Exotel API Token' },
    { key: 'exotel.account_sid', value: '', category: 'exotel', description: 'Exotel Account SID' },
    { key: 'exotel.subdomain', value: 'api.in.exotel.com', category: 'exotel', description: 'Exotel API subdomain' },
    { key: 'exotel.default_exophone', value: '', category: 'exotel', description: 'Default ExoPhone number' },
    { key: 'exotel.dlt_entity_id', value: '', category: 'exotel', description: 'DLT Entity ID for SMS' },
    
    // Timing settings (India regulations compliant)
    { key: 'exotel.business_hours_start', value: '09:00', category: 'exotel_timing', description: 'Business hours start time' },
    { key: 'exotel.business_hours_end', value: '21:00', category: 'exotel_timing', description: 'Business hours end time' },
    { key: 'exotel.dnd_start', value: '21:00', category: 'exotel_timing', description: 'DND period start time' },
    { key: 'exotel.dnd_end', value: '09:00', category: 'exotel_timing', description: 'DND period end time' },
    { key: 'exotel.promo_sms_start', value: '10:00', category: 'exotel_timing', description: 'Promotional SMS allowed start time' },
    { key: 'exotel.promo_sms_end', value: '21:00', category: 'exotel_timing', description: 'Promotional SMS allowed end time' },
    { key: 'exotel.timezone', value: 'Asia/Kolkata', category: 'exotel_timing', description: 'Timezone for call timing' },
    { key: 'exotel.weekend_calls_allowed', value: 'false', category: 'exotel_timing', description: 'Allow promotional calls on weekends' },
    { key: 'exotel.holidays', value: '[]', category: 'exotel_timing', description: 'Holiday dates (JSON array) when calls are restricted' },
    
    // Retry settings
    { key: 'exotel.retry_max_attempts', value: '3', category: 'exotel_retry', description: 'Maximum retry attempts for failed calls' },
    { key: 'exotel.retry_initial_delay', value: '300', category: 'exotel_retry', description: 'Initial retry delay in seconds' },
    { key: 'exotel.retry_backoff_multiplier', value: '2', category: 'exotel_retry', description: 'Exponential backoff multiplier' },
    { key: 'exotel.retry_max_delay', value: '3600', category: 'exotel_retry', description: 'Maximum retry delay in seconds' },
    { key: 'exotel.retry_on_busy', value: 'true', category: 'exotel_retry', description: 'Retry when line is busy' },
    { key: 'exotel.retry_on_no_answer', value: 'true', category: 'exotel_retry', description: 'Retry when no answer' },
    { key: 'exotel.retry_on_network_error', value: 'true', category: 'exotel_retry', description: 'Retry on network errors' },
    
    // Feature flags
    { key: 'exotel.verified_calls_enabled', value: 'true', category: 'exotel_features', description: 'Enable Truecaller verified calls' },
    { key: 'exotel.number_masking_enabled', value: 'true', category: 'exotel_features', description: 'Enable number masking' },
    { key: 'exotel.voice_streaming_enabled', value: 'true', category: 'exotel_features', description: 'Enable real-time voice streaming' },
    { key: 'exotel.auto_dialer_enabled', value: 'true', category: 'exotel_features', description: 'Enable auto dialer campaigns' },
    { key: 'exotel.cqa_enabled', value: 'true', category: 'exotel_features', description: 'Enable call quality analysis' },
    
    // Call templates - Order Confirmation
    { key: 'exotel.template.ORDER_CONFIRMATION.greeting', value: 'Namaste! This is Mangwale calling about your order.', category: 'exotel_templates', description: 'Order confirmation greeting' },
    { key: 'exotel.template.ORDER_CONFIRMATION.script', value: 'Your order #{orderId} for {amount} has been confirmed. Delivery expected by {deliveryDate}.', category: 'exotel_templates', description: 'Order confirmation script' },
    { key: 'exotel.template.ORDER_CONFIRMATION.closing', value: 'Thank you for ordering with Mangwale!', category: 'exotel_templates', description: 'Order confirmation closing' },
    { key: 'exotel.template.ORDER_CONFIRMATION.max_duration', value: '120', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.ORDER_CONFIRMATION.priority', value: '8', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Delivery Update
    { key: 'exotel.template.DELIVERY_UPDATE.greeting', value: 'Hello! Mangwale delivery update.', category: 'exotel_templates', description: 'Delivery update greeting' },
    { key: 'exotel.template.DELIVERY_UPDATE.script', value: 'Your package #{orderId} is {status}. {additionalInfo}', category: 'exotel_templates', description: 'Delivery update script' },
    { key: 'exotel.template.DELIVERY_UPDATE.closing', value: 'Thank you for using Mangwale!', category: 'exotel_templates', description: 'Delivery update closing' },
    { key: 'exotel.template.DELIVERY_UPDATE.max_duration', value: '90', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.DELIVERY_UPDATE.priority', value: '7', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Payment Reminder
    { key: 'exotel.template.PAYMENT_REMINDER.greeting', value: 'Hello! This is Mangwale calling about your pending payment.', category: 'exotel_templates', description: 'Payment reminder greeting' },
    { key: 'exotel.template.PAYMENT_REMINDER.script', value: 'You have a pending payment of {amount} for order #{orderId}. Please complete the payment to proceed.', category: 'exotel_templates', description: 'Payment reminder script' },
    { key: 'exotel.template.PAYMENT_REMINDER.closing', value: 'Thank you. Have a great day!', category: 'exotel_templates', description: 'Payment reminder closing' },
    { key: 'exotel.template.PAYMENT_REMINDER.max_duration', value: '120', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.PAYMENT_REMINDER.priority', value: '6', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Customer Support
    { key: 'exotel.template.CUSTOMER_SUPPORT.greeting', value: 'Hello! Welcome to Mangwale customer support.', category: 'exotel_templates', description: 'Customer support greeting' },
    { key: 'exotel.template.CUSTOMER_SUPPORT.script', value: 'How may I assist you today?', category: 'exotel_templates', description: 'Customer support script' },
    { key: 'exotel.template.CUSTOMER_SUPPORT.closing', value: 'Thank you for contacting Mangwale support!', category: 'exotel_templates', description: 'Customer support closing' },
    { key: 'exotel.template.CUSTOMER_SUPPORT.max_duration', value: '300', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.CUSTOMER_SUPPORT.priority', value: '9', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Promotional
    { key: 'exotel.template.PROMOTIONAL.greeting', value: 'Hello! Great news from Mangwale!', category: 'exotel_templates', description: 'Promotional call greeting' },
    { key: 'exotel.template.PROMOTIONAL.script', value: '{promoMessage}', category: 'exotel_templates', description: 'Promotional call script' },
    { key: 'exotel.template.PROMOTIONAL.closing', value: 'Visit mangwale.com for more offers!', category: 'exotel_templates', description: 'Promotional call closing' },
    { key: 'exotel.template.PROMOTIONAL.max_duration', value: '60', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.PROMOTIONAL.priority', value: '3', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Verification (OTP)
    { key: 'exotel.template.VERIFICATION.greeting', value: 'Hello! This is Mangwale verification call.', category: 'exotel_templates', description: 'Verification call greeting' },
    { key: 'exotel.template.VERIFICATION.script', value: 'Your verification code is {otp}. I repeat, your code is {otp}.', category: 'exotel_templates', description: 'Verification call script' },
    { key: 'exotel.template.VERIFICATION.closing', value: 'Thank you!', category: 'exotel_templates', description: 'Verification call closing' },
    { key: 'exotel.template.VERIFICATION.max_duration', value: '60', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.VERIFICATION.priority', value: '10', category: 'exotel_templates', description: 'Call priority (1-10)' },
    
    // Call templates - Feedback
    { key: 'exotel.template.FEEDBACK.greeting', value: 'Hello! This is Mangwale calling to get your feedback.', category: 'exotel_templates', description: 'Feedback call greeting' },
    { key: 'exotel.template.FEEDBACK.script', value: 'How was your recent experience with order #{orderId}? Press 1 for excellent, 2 for good, 3 for average, 4 for poor.', category: 'exotel_templates', description: 'Feedback call script' },
    { key: 'exotel.template.FEEDBACK.closing', value: 'Thank you for your feedback!', category: 'exotel_templates', description: 'Feedback call closing' },
    { key: 'exotel.template.FEEDBACK.max_duration', value: '120', category: 'exotel_templates', description: 'Max call duration in seconds' },
    { key: 'exotel.template.FEEDBACK.priority', value: '4', category: 'exotel_templates', description: 'Call priority (1-10)' },
  ];

  let created = 0;
  let updated = 0;

  for (const setting of exotelSettings) {
    const result = await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: { 
        value: setting.value, 
        category: setting.category, 
        description: setting.description,
        updatedAt: new Date(),
      },
      create: {
        key: setting.key,
        value: setting.value,
        type: 'string',
        category: setting.category,
        description: setting.description,
      },
    });
    
    // Check if it was created (has a recent createdAt) or updated
    const isNew = result.updatedAt.getTime() - Date.now() < 1000;
    if (isNew) created++;
    else updated++;
  }

  console.log(`✅ Exotel settings seeded: ${created} created, ${updated} updated`);
  console.log(`   Total: ${exotelSettings.length} settings`);
  
  // Display categories
  const categories = [...new Set(exotelSettings.map(s => s.category))];
  console.log(`   Categories: ${categories.join(', ')}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
