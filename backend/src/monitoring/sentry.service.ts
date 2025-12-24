/**
 * Sentry Error Monitoring Service
 * 
 * Provides centralized error tracking for production monitoring.
 * 
 * Setup:
 * 1. Create Sentry account at https://sentry.io
 * 2. Create a new NestJS project
 * 3. Copy DSN to .env as SENTRY_DSN
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

export interface ErrorContext {
  userId?: string | number;
  phoneNumber?: string;
  sessionId?: string;
  flowId?: string;
  intent?: string;
  message?: string;
  platform?: string;
  extra?: Record<string, any>;
}

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV', 'development');

    if (dsn) {
      Sentry.init({
        dsn,
        environment,
        release: `mangwale-ai@${process.env.npm_package_version || '1.0.0'}`,
        
        // Performance monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        
        // Error filtering
        beforeSend(event, hint) {
          // Filter out non-critical errors
          const error = hint.originalException;
          if (error instanceof Error) {
            // Skip rate limit errors (expected behavior)
            if (error.message.includes('ThrottlerException')) {
              return null;
            }
            // Skip validation errors (user input issues)
            if (error.name === 'BadRequestException') {
              return null;
            }
          }
          return event;
        },

        // Integrations
        integrations: [
          Sentry.httpIntegration(),
          Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
        ],
      });

      this.initialized = true;
      this.logger.log(`✅ Sentry initialized for ${environment} environment`);
    } else {
      this.logger.warn('⚠️ SENTRY_DSN not configured - error monitoring disabled');
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error | unknown, context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      this.logger.error(`Error (Sentry disabled): ${error}`);
      return undefined;
    }

    // Set user context
    if (context?.userId || context?.phoneNumber) {
      Sentry.setUser({
        id: String(context.userId || context.phoneNumber),
        username: context.phoneNumber,
      });
    }

    // Set tags for filtering
    if (context) {
      Sentry.setTags({
        platform: context.platform || 'unknown',
        flowId: context.flowId,
        intent: context.intent,
      });
    }

    // Set extra context
    if (context?.extra) {
      Sentry.setExtras(context.extra);
    }

    // Capture and return event ID
    const eventId = Sentry.captureException(error);
    this.logger.error(`🔴 Sentry captured error: ${eventId}`);
    return eventId;
  }

  /**
   * Capture a message (for non-exception events)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      this.logger.log(`Message (Sentry disabled): ${message}`);
      return undefined;
    }

    if (context) {
      Sentry.setTags({
        platform: context.platform || 'unknown',
        flowId: context.flowId,
        intent: context.intent,
      });
    }

    const eventId = Sentry.captureMessage(message, level);
    return eventId;
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    if (!this.initialized) return null;
    
    return Sentry.startInactiveSpan({
      name,
      op,
    });
  }

  /**
   * Set user for current scope
   */
  setUser(userId: string | number, phoneNumber?: string) {
    if (!this.initialized) return;

    Sentry.setUser({
      id: String(userId),
      username: phoneNumber,
    });
  }

  /**
   * Clear user from scope
   */
  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Flush events before shutdown
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) return true;
    return Sentry.flush(timeout);
  }
}
