/**
 * AI Metrics Logger
 * 
 * Comprehensive logging system for all AI service interactions:
 * - Performance metrics (latency, throughput)
 * - Error tracking and debugging
 * - Training data collection
 * - Cost tracking (if using cloud LLMs)
 * - Quality monitoring
 * 
 * Usage:
 * ```typescript
 * const logger = new AiMetricsLogger('vllm');
 * await logger.logRequest({
 *   service: 'vllm',
 *   operation: 'chat',
 *   input: { messages: [...] },
 *   result: { content: '...' },
 *   metrics: { latency: 500, tokens: 100 }
 * });
 * ```
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AiServiceMetrics {
  service: 'vllm' | 'nlu' | 'asr' | 'tts' | 'vision' | 'llm-cloud';
  operation: string;
  requestId?: string;
  timestamp: Date;
  
  // Input/Output
  input: any;
  result?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  
  // Performance
  metrics: {
    startTime: number; // performance.now()
    endTime: number; // performance.now()
    latency: number; // ms
    
    // LLM specific
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    throughput?: number; // tokens/sec
    
    // Retry info
    attempts?: number;
    retries?: number;
  };
  
  // Context
  context?: {
    userId?: string;
    sessionId?: string;
    flowId?: string;
    stateId?: string;
  };
  
  // Cost tracking (for cloud LLMs)
  cost?: {
    amount: number;
    currency: string;
    provider: string;
  };
  
  // Quality metrics
  quality?: {
    confidence?: number;
    intent?: string;
    sentiment?: string;
    accuracy?: number;
  };
}

@Injectable()
export class AiMetricsLogger {
  private readonly logger: Logger;
  private readonly logsDir: string;
  private readonly enableFileLogging: boolean;
  private readonly enableConsoleLogging: boolean;
  private readonly enableTrainingDataCapture: boolean;
  
  constructor(
    private readonly serviceName: string,
    private readonly config?: ConfigService,
  ) {
    this.logger = new Logger(`AiMetrics:${serviceName}`);
    this.logsDir = this.config?.get('AI_LOGS_DIR') || path.join(process.cwd(), 'logs', 'ai-metrics');
    this.enableFileLogging = this.config?.get('AI_LOGS_FILE_ENABLED') !== false;
    this.enableConsoleLogging = this.config?.get('AI_LOGS_CONSOLE_ENABLED') !== false;
    this.enableTrainingDataCapture = this.config?.get('AI_TRAINING_DATA_CAPTURE') === true;
    
    // Create logs directory if it doesn't exist
    this.initLogsDir();
  }
  
  private async initLogsDir(): Promise<void> {
    if (!this.enableFileLogging) return;
    
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(path.join(this.logsDir, 'training-data'), { recursive: true });
      await fs.mkdir(path.join(this.logsDir, 'errors'), { recursive: true });
    } catch (error) {
      this.logger.warn(`Failed to create logs directory: ${error.message}`);
    }
  }
  
  /**
   * Log AI service request/response
   */
  async logRequest(metrics: Omit<AiServiceMetrics, 'timestamp'>): Promise<void> {
    const fullMetrics: AiServiceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };
    
    // Console logging (structured for easy debugging)
    if (this.enableConsoleLogging) {
      this.logToConsole(fullMetrics);
    }
    
    // File logging (JSON for analysis)
    if (this.enableFileLogging) {
      await this.logToFile(fullMetrics);
    }
    
    // Training data capture (for improving AI models)
    if (this.enableTrainingDataCapture && !fullMetrics.error) {
      await this.captureTrainingData(fullMetrics);
    }
    
    // Error tracking (separate error logs)
    if (fullMetrics.error) {
      await this.logError(fullMetrics);
    }
  }
  
  /**
   * Console logging with color-coded output
   */
  private logToConsole(metrics: AiServiceMetrics): void {
    const { service, operation, metrics: perf, error, quality } = metrics;
    const latency = perf.latency.toFixed(2);
    const throughput = perf.throughput ? `${perf.throughput.toFixed(2)} tok/s` : 'N/A';
    
    if (error) {
      this.logger.error(
        `❌ [${service}/${operation}] Failed (${latency}ms) - ${error.message}`,
        error.stack,
      );
    } else {
      const qualityStr = quality?.confidence ? ` | Confidence: ${quality.confidence.toFixed(2)}` : '';
      const tokensStr = perf.tokens?.total ? ` | Tokens: ${perf.tokens.total}` : '';
      const retriesStr = perf.retries ? ` | Retries: ${perf.retries}` : '';
      
      this.logger.log(
        `✅ [${service}/${operation}] ${latency}ms | Throughput: ${throughput}${tokensStr}${qualityStr}${retriesStr}`
      );
    }
  }
  
  /**
   * File logging in JSONL format (one JSON object per line)
   */
  private async logToFile(metrics: AiServiceMetrics): Promise<void> {
    try {
      const date = metrics.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${metrics.service}-${date}.jsonl`;
      const filepath = path.join(this.logsDir, filename);
      
      const logLine = JSON.stringify(metrics) + '\n';
      await fs.appendFile(filepath, logLine, 'utf8');
    } catch (error) {
      this.logger.warn(`Failed to write to log file: ${error.message}`);
    }
  }
  
  /**
   * Capture training data for improving AI models
   */
  private async captureTrainingData(metrics: AiServiceMetrics): Promise<void> {
    try {
      // Only capture certain types of data
      if (metrics.service !== 'nlu' && metrics.service !== 'vllm') return;
      
      const date = metrics.timestamp.toISOString().split('T')[0];
      const filename = `training-${metrics.service}-${date}.jsonl`;
      const filepath = path.join(this.logsDir, 'training-data', filename);
      
      const trainingData = {
        timestamp: metrics.timestamp,
        service: metrics.service,
        operation: metrics.operation,
        input: metrics.input,
        output: metrics.result,
        quality: metrics.quality,
        context: metrics.context,
      };
      
      const logLine = JSON.stringify(trainingData) + '\n';
      await fs.appendFile(filepath, logLine, 'utf8');
    } catch (error) {
      this.logger.warn(`Failed to capture training data: ${error.message}`);
    }
  }
  
  /**
   * Log errors to separate error file for easy debugging
   */
  private async logError(metrics: AiServiceMetrics): Promise<void> {
    try {
      const date = metrics.timestamp.toISOString().split('T')[0];
      const filename = `errors-${metrics.service}-${date}.jsonl`;
      const filepath = path.join(this.logsDir, 'errors', filename);
      
      const errorData = {
        timestamp: metrics.timestamp,
        service: metrics.service,
        operation: metrics.operation,
        input: metrics.input,
        error: metrics.error,
        metrics: metrics.metrics,
        context: metrics.context,
      };
      
      const logLine = JSON.stringify(errorData) + '\n';
      await fs.appendFile(filepath, logLine, 'utf8');
    } catch (error) {
      this.logger.warn(`Failed to log error: ${error.message}`);
    }
  }
  
  /**
   * Get statistics for a service over a time period
   */
  async getStatistics(
    service: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    totalTokens: number;
    averageThroughput: number;
  }> {
    // TODO: Implement statistics aggregation from JSONL files
    // This would parse log files and calculate metrics
    throw new Error('Not implemented');
  }
}
