import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, IsDateString, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Try to import swagger, but provide fallbacks if not available
let ApiProperty: any = () => () => {};
let ApiPropertyOptional: any = () => () => {};

try {
  const swagger = require('@nestjs/swagger');
  ApiProperty = swagger.ApiProperty;
  ApiPropertyOptional = swagger.ApiPropertyOptional;
} catch (e) {
  // Swagger not available, using no-op decorators
}

// ============== ENUMS ==============

export enum CallType {
  TRANSACTIONAL = 'trans',
  PROMOTIONAL = 'promo',
}

export enum CallPurpose {
  ORDER_CONFIRMATION = 'order_confirmation',
  DELIVERY_UPDATE = 'delivery_update',
  PAYMENT_REMINDER = 'payment_reminder',
  PROMOTIONAL_OFFER = 'promotional_offer',
  FEEDBACK_REQUEST = 'feedback_request',
  SUPPORT_CALLBACK = 'support_callback',
  OTP_VERIFICATION = 'otp_verification',
  ABANDONED_CART = 'abandoned_cart',
  CUSTOM = 'custom',
}

export enum DialerType {
  PREDICTIVE = 'predictive',
  PREVIEW = 'preview',
  PROGRESSIVE = 'progressive',
  PACE = 'pace',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum SmsType {
  TRANSACTIONAL = 'transactional',
  TRANSACTIONAL_OPT_IN = 'transactional_opt_in',
  PROMOTIONAL = 'promotional',
}

export enum SmsPriority {
  NORMAL = 'normal',
  HIGH = 'high',
}

// ============== CONFIGURATION DTOs ==============

export class ExotelConfigDto {
  @ApiProperty({ description: 'Exotel Service URL (Mercury)', example: 'http://192.168.0.151:3100' })
  @IsString()
  serviceUrl: string;

  @ApiProperty({ description: 'Exotel API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Exotel API Token' })
  @IsString()
  apiToken: string;

  @ApiProperty({ description: 'Exotel Account SID' })
  @IsString()
  accountSid: string;

  @ApiProperty({ description: 'Exotel subdomain (api.exotel.com or api.in.exotel.com)', example: 'api.in.exotel.com' })
  @IsString()
  subdomain: string;

  @ApiPropertyOptional({ description: 'Default ExoPhone for outgoing calls' })
  @IsOptional()
  @IsString()
  defaultExoPhone?: string;

  @ApiPropertyOptional({ description: 'DLT Entity ID for SMS in India' })
  @IsOptional()
  @IsString()
  dltEntityId?: string;
}

export class CallTimingConfigDto {
  @ApiProperty({ description: 'Business hours start (24h format)', example: '09:00' })
  @IsString()
  businessHoursStart: string;

  @ApiProperty({ description: 'Business hours end (24h format)', example: '21:00' })
  @IsString()
  businessHoursEnd: string;

  @ApiProperty({ description: 'DND (Do Not Disturb) start time', example: '21:00' })
  @IsString()
  dndStart: string;

  @ApiProperty({ description: 'DND end time', example: '09:00' })
  @IsString()
  dndEnd: string;

  @ApiPropertyOptional({ description: 'Promotional SMS allowed start (India: 10:00)', example: '10:00' })
  @IsOptional()
  @IsString()
  promoSmsStart?: string;

  @ApiPropertyOptional({ description: 'Promotional SMS allowed end (India: 21:00)', example: '21:00' })
  @IsOptional()
  @IsString()
  promoSmsEnd?: string;

  @ApiProperty({ description: 'Timezone for all timing calculations', example: 'Asia/Kolkata' })
  @IsString()
  timezone: string;

  @ApiPropertyOptional({ description: 'Weekend calling allowed', default: false })
  @IsOptional()
  @IsBoolean()
  weekendCallsAllowed?: boolean;

  @ApiPropertyOptional({ description: 'Holiday list (ISO date strings)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];
}

export class RetryConfigDto {
  @ApiProperty({ description: 'Maximum retry attempts', example: 3 })
  @IsNumber()
  @Min(0)
  @Max(10)
  maxAttempts: number;

  @ApiProperty({ description: 'Initial delay between retries (seconds)', example: 300 })
  @IsNumber()
  @Min(60)
  initialDelaySeconds: number;

  @ApiProperty({ description: 'Backoff multiplier for subsequent retries', example: 2 })
  @IsNumber()
  @Min(1)
  @Max(5)
  backoffMultiplier: number;

  @ApiProperty({ description: 'Maximum delay between retries (seconds)', example: 3600 })
  @IsNumber()
  maxDelaySeconds: number;

  @ApiPropertyOptional({ description: 'Retry on busy signal', default: true })
  @IsOptional()
  @IsBoolean()
  retryOnBusy?: boolean;

  @ApiPropertyOptional({ description: 'Retry on no answer', default: true })
  @IsOptional()
  @IsBoolean()
  retryOnNoAnswer?: boolean;

  @ApiPropertyOptional({ description: 'Retry on network error', default: true })
  @IsOptional()
  @IsBoolean()
  retryOnNetworkError?: boolean;
}

// ============== CLICK-TO-CALL DTOs ==============

export class ClickToCallDto {
  @ApiProperty({ description: 'Agent phone number (E.164 format)', example: '+919876543210' })
  @IsString()
  agentPhone: string;

  @ApiProperty({ description: 'Customer phone number (E.164 format)', example: '+919123456789' })
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional({ description: 'Caller ID to show (ExoPhone)', example: '08040XXXXX' })
  @IsOptional()
  @IsString()
  callerId?: string;

  @ApiPropertyOptional({ description: 'Max call duration in seconds', example: 1800 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(7200)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Record this call', default: true })
  @IsOptional()
  @IsBoolean()
  recordCall?: boolean;

  @ApiPropertyOptional({ description: 'Custom field for tracking (order ID, etc)', example: 'ORDER-12345' })
  @IsOptional()
  @IsString()
  customField?: string;

  @ApiPropertyOptional({ description: 'Callback URL for call status updates' })
  @IsOptional()
  @IsString()
  statusCallback?: string;
}

export class ClickToCallResponseDto {
  @ApiProperty({ description: 'Exotel Call SID' })
  callSid: string;

  @ApiProperty({ description: 'Call status', example: 'initiated' })
  status: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

// ============== NUMBER MASKING DTOs ==============

export class NumberMaskingDto {
  @ApiProperty({ description: 'Party A phone (Agent)', example: '+919876543210' })
  @IsString()
  partyA: string;

  @ApiProperty({ description: 'Party B phone (Customer)', example: '+919123456789' })
  @IsString()
  partyB: string;

  @ApiPropertyOptional({ description: 'Masked number expiry in hours', example: 24, default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  expiresInHours?: number;

  @ApiPropertyOptional({ description: 'Call type', enum: CallType, default: CallType.TRANSACTIONAL })
  @IsOptional()
  @IsEnum(CallType)
  callType?: CallType;

  @ApiPropertyOptional({ description: 'Context (order ID, delivery ID)', example: 'ORDER-12345' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class NumberMaskingResponseDto {
  @ApiProperty({ description: 'Virtual masked number' })
  virtualNumber: string;

  @ApiProperty({ description: 'Expiry timestamp' })
  expiresAt: Date;

  @ApiProperty({ description: 'Mapping ID for reference' })
  mappingId: string;
}

// ============== VOICE STREAMING DTOs ==============

export class VoiceStreamStartDto {
  @ApiProperty({ description: 'Session ID for tracking' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Language for ASR/TTS', example: 'hi-IN' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'WebSocket endpoint for audio stream' })
  @IsOptional()
  @IsString()
  wsEndpoint?: string;
}

// ============== VERIFIED CALLS DTOs ==============

export class VerifiedCallDto {
  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Call reason shown on Truecaller', example: 'Order Delivery Update' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Order ID for tracking' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Priority level', example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;
}

// ============== SMS DTOs ==============

export class SendSmsDto {
  @ApiProperty({ description: 'Recipient phone number' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'SMS message body (max 2000 chars)', maxLength: 2000 })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'SMS template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'DLT Template ID (India)' })
  @IsOptional()
  @IsString()
  dltTemplateId?: string;

  @ApiPropertyOptional({ description: 'SMS type', enum: SmsType })
  @IsOptional()
  @IsEnum(SmsType)
  smsType?: SmsType;

  @ApiPropertyOptional({ description: 'Priority', enum: SmsPriority, default: SmsPriority.NORMAL })
  @IsOptional()
  @IsEnum(SmsPriority)
  priority?: SmsPriority;

  @ApiPropertyOptional({ description: 'Custom field for tracking' })
  @IsOptional()
  @IsString()
  customField?: string;

  @ApiPropertyOptional({ description: 'Status callback URL' })
  @IsOptional()
  @IsString()
  statusCallback?: string;
}

export class BulkSmsDto {
  @ApiProperty({ description: 'Sender ID or ExoPhone' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'Array of recipient numbers', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({ description: 'SMS message body' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'SMS type', enum: SmsType })
  @IsOptional()
  @IsEnum(SmsType)
  smsType?: SmsType;

  @ApiPropertyOptional({ description: 'DLT Entity ID' })
  @IsOptional()
  @IsString()
  dltEntityId?: string;

  @ApiPropertyOptional({ description: 'DLT Template ID' })
  @IsOptional()
  @IsString()
  dltTemplateId?: string;
}

// ============== WHATSAPP DTOs ==============

export class SendWhatsAppDto {
  @ApiProperty({ description: 'Recipient phone number' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'WhatsApp template name' })
  @IsString()
  templateName: string;

  @ApiPropertyOptional({ description: 'Template variables', type: Object })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Language code', example: 'en' })
  @IsOptional()
  @IsString()
  languageCode?: string;
}

// ============== CAMPAIGN DTOs ==============

export class CampaignContactDto {
  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Campaign type', example: 'outbound' })
  @IsString()
  type: 'outbound' | 'sms' | 'whatsapp' | 'voice_blast';

  @ApiProperty({ description: 'Contact list', type: [CampaignContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignContactDto)
  contacts: CampaignContactDto[];

  @ApiPropertyOptional({ description: 'Message/Voice template' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Call purpose', enum: CallPurpose })
  @IsOptional()
  @IsEnum(CallPurpose)
  purpose?: CallPurpose;

  @ApiPropertyOptional({ description: 'Dialer type', enum: DialerType, default: DialerType.PROGRESSIVE })
  @IsOptional()
  @IsEnum(DialerType)
  dialerType?: DialerType;

  @ApiPropertyOptional({ description: 'Schedule time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  schedule?: string;

  @ApiPropertyOptional({ description: 'Retry configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryConfigDto)
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({ description: 'Priority (1-10)', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Tags for filtering', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'New schedule time' })
  @IsOptional()
  @IsDateString()
  schedule?: string;

  @ApiPropertyOptional({ description: 'Add more contacts', type: [CampaignContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignContactDto)
  addContacts?: CampaignContactDto[];
}

// ============== CALL SCHEDULING DTOs ==============

export class ScheduledCallDto {
  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Call purpose', enum: CallPurpose })
  @IsEnum(CallPurpose)
  purpose: CallPurpose;

  @ApiPropertyOptional({ description: 'Preferred call time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  preferredTime?: string;

  @ApiPropertyOptional({ description: 'Context data (order info, etc)', type: Object })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Use verified caller ID (Truecaller)', default: true })
  @IsOptional()
  @IsBoolean()
  useVerifiedCall?: boolean;

  @ApiPropertyOptional({ description: 'Custom retry config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryConfigDto)
  retryConfig?: RetryConfigDto;

  @ApiPropertyOptional({ description: 'Priority (1=highest, 10=lowest)', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

// ============== CQA DTOs ==============

export class AnalyzeCallDto {
  @ApiProperty({ description: 'Call SID to analyze' })
  @IsString()
  callSid: string;

  @ApiPropertyOptional({ description: 'Analysis type', example: 'full' })
  @IsOptional()
  @IsString()
  analysisType?: 'sentiment' | 'keywords' | 'compliance' | 'full';
}

// ============== VOICE ORDERING DTOs ==============

export class VoiceOrderDto {
  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Action', example: 'start' })
  @IsString()
  action: 'start' | 'confirm' | 'cancel' | 'modify';

  @ApiPropertyOptional({ description: 'Order data' })
  @IsOptional()
  @IsObject()
  orderData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Session ID for continuing conversation' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

// ============== QUERY/FILTER DTOs ==============

export class CallLogsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Call status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Call direction (inbound/outbound)' })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional({ description: 'From date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Phone number filter' })
  @IsOptional()
  @IsString()
  phone?: string;
}

// ============== TIMING CHECK RESPONSE ==============

export class TimingCheckResponseDto {
  @ApiProperty({ description: 'Is calling allowed now' })
  canCall: boolean;

  @ApiProperty({ description: 'Is SMS allowed now' })
  canSms: boolean;

  @ApiProperty({ description: 'Is promotional SMS allowed' })
  canPromoSms: boolean;

  @ApiProperty({ description: 'Reason if not allowed' })
  reason?: string;

  @ApiProperty({ description: 'Next available calling time' })
  nextAvailableTime?: Date;

  @ApiProperty({ description: 'Current time in configured timezone' })
  currentTime: string;

  @ApiProperty({ description: 'Timezone' })
  timezone: string;
}

// ============== EXOTEL SYSTEM SETTINGS KEYS ==============

export const EXOTEL_SETTINGS_KEYS = {
  SERVICE_URL: 'exotel-service-url',
  API_KEY: 'exotel-api-key',
  API_TOKEN: 'exotel-api-token',
  ACCOUNT_SID: 'exotel-account-sid',
  SUBDOMAIN: 'exotel-subdomain',
  DEFAULT_EXOPHONE: 'exotel-default-exophone',
  DLT_ENTITY_ID: 'exotel-dlt-entity-id',
  
  // Timing settings
  BUSINESS_HOURS_START: 'exotel-business-hours-start',
  BUSINESS_HOURS_END: 'exotel-business-hours-end',
  DND_START: 'exotel-dnd-start',
  DND_END: 'exotel-dnd-end',
  PROMO_SMS_START: 'exotel-promo-sms-start',
  PROMO_SMS_END: 'exotel-promo-sms-end',
  TIMEZONE: 'exotel-timezone',
  WEEKEND_CALLS_ALLOWED: 'exotel-weekend-calls-allowed',
  
  // Retry settings
  RETRY_MAX_ATTEMPTS: 'exotel-retry-max-attempts',
  RETRY_INITIAL_DELAY: 'exotel-retry-initial-delay',
  RETRY_BACKOFF_MULTIPLIER: 'exotel-retry-backoff-multiplier',
  RETRY_MAX_DELAY: 'exotel-retry-max-delay',
  
  // Feature flags
  VERIFIED_CALLS_ENABLED: 'exotel-verified-calls-enabled',
  NUMBER_MASKING_ENABLED: 'exotel-number-masking-enabled',
  VOICE_STREAMING_ENABLED: 'exotel-voice-streaming-enabled',
  AUTO_DIALER_ENABLED: 'exotel-auto-dialer-enabled',
  CQA_ENABLED: 'exotel-cqa-enabled',
} as const;
