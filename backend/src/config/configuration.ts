export default () => ({
  app: {
    name: process.env.APP_NAME || 'Headless Mangwale',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    testMode: process.env.TEST_MODE === 'true' || process.env.TEST_MODE === '1',
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    get apiBaseUrl() {
      return `https://graph.facebook.com/${this.apiVersion}`;
    },
  },
  php: {
    baseUrl: process.env.PHP_API_BASE_URL,
    timeout: parseInt(process.env.PHP_API_TIMEOUT, 10) || 30000,
    defaultModuleId: parseInt(process.env.DEFAULT_PARCEL_MODULE_ID, 10) || 3,
  },
  // NLU Configuration - Local IndicBERT service (NO ADMIN BACKEND)
  nlu: {
    endpoint: process.env.NLU_ENDPOINT || 'http://nlu:7010',
    enabled: process.env.NLU_AI_ENABLED !== 'false', // enabled by default
    timeout: parseInt(process.env.NLU_TIMEOUT, 10) || 5000,
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 1,
  },
  session: {
    ttl: parseInt(process.env.SESSION_TTL, 10) || 86400,
    otpTtl: parseInt(process.env.OTP_TTL, 10) || 600,
    otpLength: parseInt(process.env.OTP_LENGTH, 10) || 6,
  },
  messaging: {
    // If true, MessagingService will prefer the session's stored platform
    // over the explicitly provided platform when sending messages.
    // This enables channel-agnostic ConversationService flows.
    forceSessionPlatform: process.env.FORCE_SESSION_PLATFORM !== 'false',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  training: {
    confidenceThresholds: {
      high: parseFloat(process.env.TRAINING_CONFIDENCE_HIGH) || 0.85,
      medium: parseFloat(process.env.TRAINING_CONFIDENCE_MEDIUM) || 0.70,
    },
    reviewPriorities: {
      high: parseInt(process.env.TRAINING_PRIORITY_HIGH, 10) || 2,
      medium: parseInt(process.env.TRAINING_PRIORITY_MEDIUM, 10) || 5,
      low: parseInt(process.env.TRAINING_PRIORITY_LOW, 10) || 10,
    },
    defaultQualityScore: parseFloat(process.env.TRAINING_DEFAULT_QUALITY_SCORE) || 0.9,
  },
});

