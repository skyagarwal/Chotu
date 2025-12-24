/**
 * Structured Logging Service
 * 
 * Provides JSON-structured logging for log aggregation systems.
 * Compatible with: Loki, ELK, CloudWatch, Datadog, etc.
 * 
 * Output format:
 * {"timestamp":"2025-12-24T03:30:00.000Z","level":"info","service":"mangwale-ai","context":"ChatController","message":"User message received","data":{...}}
 */

import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  context?: string;
  message: string;
  data?: Record<string, any>;
  traceId?: string;
  userId?: string;
  sessionId?: string;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;
  private logFile?: fs.WriteStream;
  private serviceName = 'mangwale-ai';
  private logToFile = false;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor(private configService?: ConfigService) {
    if (configService) {
      this.logToFile = configService.get<boolean>('LOG_TO_FILE', false);
      this.logLevel = configService.get<string>('LOG_LEVEL', 'info') as any;
      
      if (this.logToFile) {
        const logDir = configService.get<string>('LOG_DIR', '/var/log/mangwale');
        const logPath = path.join(logDir, `${this.serviceName}.log`);
        
        try {
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          this.logFile = fs.createWriteStream(logPath, { flags: 'a' });
        } catch (err) {
          console.error(`Failed to create log file: ${err.message}`);
        }
      }
    }
  }

  setContext(context: string) {
    this.context = context;
    return this;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatEntry(level: LogEntry['level'], message: any, data?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      context: this.context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data,
    };
  }

  private output(entry: LogEntry) {
    const jsonLine = JSON.stringify(entry);
    
    // Always output to stdout (for Docker logs / CloudWatch)
    process.stdout.write(jsonLine + '\n');
    
    // Optionally write to file
    if (this.logFile) {
      this.logFile.write(jsonLine + '\n');
    }
  }

  log(message: any, context?: string, data?: Record<string, any>) {
    if (!this.shouldLog('info')) return;
    const entry = this.formatEntry('info', message, data);
    if (context) entry.context = context;
    this.output(entry);
  }

  info(message: any, data?: Record<string, any>) {
    this.log(message, this.context, data);
  }

  error(message: any, trace?: string, context?: string) {
    const entry = this.formatEntry('error', message, { trace });
    if (context) entry.context = context;
    this.output(entry);
  }

  warn(message: any, context?: string, data?: Record<string, any>) {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatEntry('warn', message, data);
    if (context) entry.context = context;
    this.output(entry);
  }

  debug(message: any, context?: string, data?: Record<string, any>) {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatEntry('debug', message, data);
    if (context) entry.context = context;
    this.output(entry);
  }

  verbose(message: any, context?: string) {
    this.debug(message, context);
  }

  /**
   * Log a conversation event (for analytics)
   */
  logConversation(event: {
    sessionId: string;
    userId?: string;
    phoneNumber?: string;
    intent: string;
    confidence: number;
    message: string;
    response: string;
    flowId?: string;
    executionTimeMs: number;
  }) {
    const entry = this.formatEntry('info', 'conversation_event', {
      ...event,
      type: 'conversation',
    });
    this.output(entry);
  }

  /**
   * Log an API request (for monitoring)
   */
  logRequest(event: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    ip?: string;
    userAgent?: string;
  }) {
    const entry = this.formatEntry('info', 'http_request', {
      ...event,
      type: 'request',
    });
    this.output(entry);
  }

  /**
   * Log a flow execution event
   */
  logFlowEvent(event: {
    sessionId: string;
    flowId: string;
    state: string;
    action: 'start' | 'transition' | 'complete' | 'error';
    data?: Record<string, any>;
  }) {
    const entry = this.formatEntry('info', 'flow_event', {
      ...event,
      type: 'flow',
    });
    this.output(entry);
  }

  /**
   * Close log file on shutdown
   */
  onModuleDestroy() {
    if (this.logFile) {
      this.logFile.end();
    }
  }
}

/**
 * Factory function for creating logger with context
 */
export function createLogger(context: string, configService?: ConfigService): StructuredLoggerService {
  const logger = new StructuredLoggerService(configService);
  logger.setContext(context);
  return logger;
}
