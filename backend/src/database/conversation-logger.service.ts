import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';

/**
 * Conversation Logger Service
 * 
 * Stores all conversations to PostgreSQL for:
 * - Future AI/ML training
 * - Analytics and insights
 * - Debugging and quality monitoring
 * - Compliance and audit trails
 * 
 * Database: headless_mangwale
 * Table: conversation_messages
 */
@Injectable()
export class ConversationLoggerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversationLoggerService.name);
  private pool: Pool;

  async onModuleInit() {
    // Initialize PostgreSQL connection pool
    const databaseUrl = process.env.DATABASE_URL || 
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.log('✅ PostgreSQL connection pool initialized for conversation logging');
    } catch (error) {
      this.logger.error(`❌ Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('✅ PostgreSQL connection pool closed');
  }

  /**
   * Log a user message to database
   */
  async logUserMessage(params: {
    phone: string;
    userId?: number;
    messageText: string;
    platform?: string;
    sessionId?: string;
    flowId?: string;
    stepId?: string;
    variables?: Record<string, any>;
    nluIntent?: string;
    nluConfidence?: number;
    entities?: Record<string, any>;
  }): Promise<void> {
    try {
      // Store all fields including platform and entities for training
      await this.pool.query(
        `INSERT INTO conversation_messages 
         (id, session_id, sender, message, intent, confidence, platform, phone, flow_id, step_id, variables, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          randomUUID(), // id
          params.sessionId || params.phone, // session_id
          'user', // sender
          params.messageText, // message
          params.nluIntent || null, // intent
          params.nluConfidence || null, // confidence
          params.platform || 'unknown', // platform - CRITICAL for training analytics
          params.phone, // phone
          params.flowId || null, // flow_id
          params.stepId || null, // step_id
          JSON.stringify(params.variables || {}), // variables (includes entities if passed)
        ]
      );

      this.logger.debug(`📝 Logged user message from ${params.phone} [${params.platform || 'unknown'}]`);
    } catch (error) {
      this.logger.error(`❌ Failed to log user message: ${error.message}`);
    }
  }

  /**
   * Log a bot response to database
   */
  async logBotMessage(params: {
    phone: string;
    userId?: number;
    messageText: string;
    platform?: string;
    sessionId?: string;
    flowId?: string;
    stepId?: string;
    variables?: Record<string, any>;
    agentId?: string;
  }): Promise<void> {
    try {
      // Store all fields including platform for analytics
      await this.pool.query(
        `INSERT INTO conversation_messages 
         (id, session_id, sender, message, intent, confidence, platform, phone, flow_id, step_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          randomUUID(), // id
          params.sessionId || params.phone, // session_id
          'assistant', // sender (bot)
          params.messageText, // message
          params.flowId || params.agentId || null, // intent (store flow/agent ID)
          1.0, // confidence (always 1.0 for bot responses)
          params.platform || 'unknown', // platform
          params.phone, // phone
          params.flowId || null, // flow_id
          params.stepId || null, // step_id
        ]
      );

      this.logger.debug(`📝 Logged bot message to ${params.phone} [${params.platform || 'unknown'}]`);
    } catch (error) {
      this.logger.error(`❌ Failed to log bot message: ${error.message}`);
    }
  }

  /**
   * Get conversation history for a user (useful for context retrieval)
   */
  async getConversationHistory(phone: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT id, message_type, message_text, flow_id, step_id, variables, created_at
         FROM conversation_messages
         WHERE phone = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [phone, limit]
      );

      return result.rows;
    } catch (error) {
      this.logger.error(`❌ Failed to get conversation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent conversation history by session ID (for WebSocket reconnection)
   * Returns messages in ascending order (oldest first) for proper display
   */
  async getSessionHistory(sessionId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT 
           id, 
           sender as role,
           message as content,
           variables,
           created_at as timestamp
         FROM conversation_messages
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [sessionId, limit]
      );

      // Return in ascending order (oldest first) for chat display
      const messages = result.rows.reverse().map(row => ({
        id: row.id,
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content,
        timestamp: new Date(row.timestamp).getTime(),
        // Parse any cards/buttons from variables if present
        ...(row.variables?.cards && { cards: row.variables.cards }),
        ...(row.variables?.buttons && { buttons: row.variables.buttons }),
      }));

      this.logger.debug(`📜 Retrieved ${messages.length} messages for session ${sessionId}`);
      return messages;
    } catch (error) {
      this.logger.error(`❌ Failed to get session history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(): Promise<{
    totalMessages: number;
    uniqueUsers: number;
    todayMessages: number;
    avgMessagesPerUser: number;
  }> {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT phone) as unique_users,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_messages,
          ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT phone), 0), 2) as avg_messages_per_user
        FROM conversation_messages
      `);

      const row = result.rows[0];
      return {
        totalMessages: parseInt(row.total_messages),
        uniqueUsers: parseInt(row.unique_users),
        todayMessages: parseInt(row.today_messages),
        avgMessagesPerUser: parseFloat(row.avg_messages_per_user) || 0,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get conversation stats: ${error.message}`);
      return {
        totalMessages: 0,
        uniqueUsers: 0,
        todayMessages: 0,
        avgMessagesPerUser: 0,
      };
    }
  }

  /**
   * Export training data for NLU retraining
   * Returns conversation pairs with intent labels
   */
  async exportTrainingData(params?: {
    startDate?: Date;
    endDate?: Date;
    minConfidence?: number;
  }): Promise<Array<{
    userMessage: string;
    botResponse: string;
    intent: string;
    confidence: number;
    flowId: string;
    createdAt: Date;
  }>> {
    try {
      let query = `
        SELECT 
          u.message_text as user_message,
          b.message_text as bot_response,
          u.variables->>'nlu' as nlu_data,
          u.flow_id,
          u.created_at
        FROM conversation_messages u
        LEFT JOIN conversation_messages b 
          ON b.phone = u.phone 
          AND b.created_at > u.created_at 
          AND b.message_type = 'bot'
          AND b.created_at = (
            SELECT MIN(created_at) 
            FROM conversation_messages 
            WHERE phone = u.phone 
            AND created_at > u.created_at 
            AND message_type = 'bot'
          )
        WHERE u.message_type = 'user'
          AND u.variables->>'nlu' IS NOT NULL
      `;

      const queryParams: any[] = [];
      
      if (params?.startDate) {
        queryParams.push(params.startDate);
        query += ` AND u.created_at >= $${queryParams.length}`;
      }
      
      if (params?.endDate) {
        queryParams.push(params.endDate);
        query += ` AND u.created_at <= $${queryParams.length}`;
      }

      query += ` ORDER BY u.created_at DESC LIMIT 10000`;

      const result = await this.pool.query(query, queryParams);

      return result.rows
        .map(row => {
          try {
            const nlu = typeof row.nlu_data === 'string' 
              ? JSON.parse(row.nlu_data) 
              : row.nlu_data;
            
            return {
              userMessage: row.user_message,
              botResponse: row.bot_response || '',
              intent: nlu?.intent || 'unknown',
              confidence: nlu?.confidence || 0,
              flowId: row.flow_id || '',
              createdAt: row.created_at,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(item => {
          if (!item) return false;
          if (params?.minConfidence && item.confidence < params.minConfidence) {
            return false;
          }
          return true;
        });
    } catch (error) {
      this.logger.error(`❌ Failed to export training data: ${error.message}`);
      return [];
    }
  }

  /**
   * Get failed conversations (for continuous learning)
   * Identifies conversations where user got stuck or received errors
   */
  async getFailedConversations(limit: number = 100): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          phone,
          session_id,
          COUNT(*) as message_count,
          MAX(created_at) as last_message,
          STRING_AGG(DISTINCT flow_id, ', ') as flows,
          BOOL_OR(message_text LIKE '%error%' OR message_text LIKE '%wrong%' OR message_text LIKE '%try again%') as had_error
        FROM conversation_messages
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY phone, session_id
        HAVING 
          BOOL_OR(message_text LIKE '%error%' OR message_text LIKE '%wrong%' OR message_text LIKE '%try again%')
          OR COUNT(*) > 15  -- Long conversation might indicate confusion
        ORDER BY last_message DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      this.logger.error(`❌ Failed to get failed conversations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get intent distribution for analytics
   */
  async getIntentDistribution(days: number = 7): Promise<Array<{
    intent: string;
    count: number;
    avgConfidence: number;
  }>> {
    try {
      const result = await this.pool.query(`
        SELECT 
          variables->'nlu'->>'intent' as intent,
          COUNT(*) as count,
          ROUND(AVG((variables->'nlu'->>'confidence')::float), 2) as avg_confidence
        FROM conversation_messages
        WHERE message_type = 'user'
          AND created_at >= NOW() - INTERVAL '${days} days'
          AND variables->'nlu'->>'intent' IS NOT NULL
        GROUP BY variables->'nlu'->>'intent'
        ORDER BY count DESC
      `);

      return result.rows.map(row => ({
        intent: row.intent,
        count: parseInt(row.count),
        avgConfidence: parseFloat(row.avg_confidence) || 0,
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get intent distribution: ${error.message}`);
      return [];
    }
  }
}
