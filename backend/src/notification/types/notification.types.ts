/**
 * Notification Types for Multi-Channel Notifications
 */

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  status: NotificationStatus;
  messageId?: string;
  timestamp?: Date;
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  providerResponse?: any;
}

export interface NotificationPayload {
  recipient: string;
  channel: NotificationChannel;
  message: string;
  title?: string;
  data?: Record<string, any>;
  buttons?: NotificationButton[];
  mediaUrl?: string;
}

export interface NotificationButton {
  id: string;
  label: string;
  action?: string;
  url?: string;
}
