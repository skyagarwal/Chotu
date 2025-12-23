import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 🚨 Usage Alerts Service
 * 
 * Monitors LLM usage and sends alerts:
 * - Budget threshold alerts (80%, 90%, 100%)
 * - Anomaly detection (unusual spike in usage)
 * - Rate limit warnings
 * - Model failure alerts
 * - Daily/Weekly usage summaries
 * 
 * Alert Channels:
 * - In-app notifications
 * - Email (via SMTP)
 * - Webhook (Slack, Teams, Discord)
 * - SMS (for critical alerts)
 */

export interface AlertConfig {
  tenantId: number;
  alertType: string;
  channels: ('email' | 'webhook' | 'sms' | 'in_app')[];
  threshold?: number;
  recipients: string[];
  webhookUrl?: string;
  isEnabled: boolean;
}

export interface Alert {
  id: string;
  tenantId: number;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  acknowledged: boolean;
  createdAt: Date;
}

@Injectable()
export class UsageAlertsService implements OnModuleInit {
  private readonly logger = new Logger(UsageAlertsService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🚨 UsageAlertsService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    try {
      const client = await this.pool.connect();

      await client.query(`
        -- Alert configurations per tenant
        CREATE TABLE IF NOT EXISTS alert_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          alert_type VARCHAR(50) NOT NULL, -- budget_warning, rate_limit, model_failure, anomaly, daily_summary
          channels TEXT[] DEFAULT ARRAY['in_app'],
          threshold FLOAT,
          recipients TEXT[] DEFAULT ARRAY[]::text[],
          webhook_url TEXT,
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, alert_type)
        );

        -- Alert history
        CREATE TABLE IF NOT EXISTS alerts_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT,
          data JSONB,
          channels_sent TEXT[],
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(100),
          acknowledged_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts_history(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts_history(alert_type);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_alerts_unack ON alerts_history(tenant_id, acknowledged) WHERE acknowledged = false;

        -- Usage anomalies detection baseline
        CREATE TABLE IF NOT EXISTS usage_baseline (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          metric VARCHAR(50) NOT NULL, -- daily_requests, daily_tokens, daily_cost
          day_of_week INTEGER, -- 0-6
          hour_of_day INTEGER, -- 0-23
          avg_value FLOAT,
          std_dev FLOAT,
          sample_count INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, metric, day_of_week, hour_of_day)
        );
      `);

      client.release();
      this.logger.log('✅ UsageAlertsService initialized');
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Send an alert
   */
  async sendAlert(
    tenantId: number,
    alertType: string,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<string | null> {
    try {
      // Get alert configuration
      const config = await this.getAlertConfig(tenantId, alertType);
      
      if (!config.isEnabled) {
        this.logger.debug(`Alert ${alertType} disabled for tenant ${tenantId}`);
        return null;
      }

      // Check if similar alert was sent recently (dedup)
      const recent = await this.pool.query(
        `SELECT id FROM alerts_history 
         WHERE tenant_id = $1 AND alert_type = $2 AND title = $3
         AND created_at >= NOW() - INTERVAL '1 hour'`,
        [tenantId, alertType, title],
      );

      if (recent.rows.length > 0) {
        this.logger.debug(`Duplicate alert suppressed: ${title}`);
        return null;
      }

      // Store alert
      const result = await this.pool.query(
        `INSERT INTO alerts_history (tenant_id, alert_type, severity, title, message, data, channels_sent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [tenantId, alertType, severity, title, message, data || {}, config.channels],
      );

      const alertId = result.rows[0].id;

      // Send to channels
      const channelsSent: string[] = [];

      for (const channel of config.channels) {
        try {
          switch (channel) {
            case 'in_app':
              // Already stored in database
              channelsSent.push('in_app');
              break;

            case 'email':
              if (config.recipients.length > 0) {
                await this.sendEmail(config.recipients, title, message, severity);
                channelsSent.push('email');
              }
              break;

            case 'webhook':
              if (config.webhookUrl) {
                await this.sendWebhook(config.webhookUrl, { alertType, severity, title, message, data });
                channelsSent.push('webhook');
              }
              break;

            case 'sms':
              if (config.recipients.length > 0 && severity === 'critical') {
                await this.sendSms(config.recipients, title);
                channelsSent.push('sms');
              }
              break;
          }
        } catch (error: any) {
          this.logger.error(`Failed to send alert via ${channel}: ${error.message}`);
        }
      }

      this.logger.log(`🚨 Alert sent: [${severity}] ${title} via ${channelsSent.join(', ')}`);
      return alertId;
    } catch (error: any) {
      this.logger.error(`Failed to send alert: ${error.message}`);
      return null;
    }
  }

  /**
   * Get alert configuration
   */
  private async getAlertConfig(tenantId: number, alertType: string): Promise<AlertConfig> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM alert_configurations WHERE tenant_id = $1 AND alert_type = $2`,
        [tenantId, alertType],
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          tenantId,
          alertType,
          channels: row.channels || ['in_app'],
          threshold: row.threshold,
          recipients: row.recipients || [],
          webhookUrl: row.webhook_url,
          isEnabled: row.is_enabled,
        };
      }
    } catch (error) {
      // Return defaults
    }

    return {
      tenantId,
      alertType,
      channels: ['in_app'],
      recipients: [],
      isEnabled: true,
    };
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmail(recipients: string[], title: string, message: string, severity: string): Promise<void> {
    // TODO: Implement email sending via SMTP or service like SendGrid
    this.logger.debug(`📧 Email: ${title} to ${recipients.join(', ')}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(webhookUrl: string, payload: any): Promise<void> {
    try {
      const axios = require('axios');
      await axios.post(webhookUrl, {
        text: `🚨 ${payload.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${payload.severity.toUpperCase()}*: ${payload.title}\n${payload.message}`,
            },
          },
        ],
        ...payload,
      }, { timeout: 5000 });
    } catch (error: any) {
      throw new Error(`Webhook failed: ${error.message}`);
    }
  }

  /**
   * Send SMS alert (placeholder)
   */
  private async sendSms(recipients: string[], message: string): Promise<void> {
    // TODO: Implement SMS via Twilio or MSG91
    this.logger.debug(`📱 SMS: ${message} to ${recipients.join(', ')}`);
  }

  /**
   * Check for usage anomalies
   */
  async checkForAnomalies(tenantId: number, metric: string, currentValue: number): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();

    try {
      const baseline = await this.pool.query(
        `SELECT avg_value, std_dev FROM usage_baseline
         WHERE tenant_id = $1 AND metric = $2 AND day_of_week = $3 AND hour_of_day = $4`,
        [tenantId, metric, dayOfWeek, hourOfDay],
      );

      if (baseline.rows.length > 0) {
        const { avg_value, std_dev } = baseline.rows[0];
        const zScore = Math.abs((currentValue - avg_value) / (std_dev || 1));

        if (zScore > 3) {
          await this.sendAlert(
            tenantId,
            'anomaly',
            zScore > 5 ? 'critical' : 'warning',
            `Unusual ${metric} detected`,
            `Current ${metric}: ${currentValue.toFixed(2)} (expected ~${avg_value.toFixed(2)}). This is ${zScore.toFixed(1)} standard deviations from normal.`,
            { metric, currentValue, expectedValue: avg_value, zScore },
          );
        }
      }

      // Update baseline with current value
      await this.updateBaseline(tenantId, metric, currentValue);
    } catch (error: any) {
      this.logger.error(`Anomaly check failed: ${error.message}`);
    }
  }

  /**
   * Update usage baseline
   */
  private async updateBaseline(tenantId: number, metric: string, value: number): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();

    try {
      await this.pool.query(
        `INSERT INTO usage_baseline (tenant_id, metric, day_of_week, hour_of_day, avg_value, std_dev, sample_count)
         VALUES ($1, $2, $3, $4, $5, 0, 1)
         ON CONFLICT (tenant_id, metric, day_of_week, hour_of_day) DO UPDATE SET
           avg_value = (usage_baseline.avg_value * usage_baseline.sample_count + $5) / (usage_baseline.sample_count + 1),
           std_dev = SQRT(
             (usage_baseline.sample_count * POWER(usage_baseline.std_dev, 2) + 
              POWER($5 - usage_baseline.avg_value, 2)) / (usage_baseline.sample_count + 1)
           ),
           sample_count = usage_baseline.sample_count + 1,
           updated_at = NOW()`,
        [tenantId, metric, dayOfWeek, hourOfDay, value],
      );
    } catch (error: any) {
      this.logger.error(`Failed to update baseline: ${error.message}`);
    }
  }

  /**
   * Get unacknowledged alerts for tenant
   */
  async getUnacknowledgedAlerts(tenantId: number): Promise<Alert[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM alerts_history
         WHERE tenant_id = $1 AND acknowledged = false
         ORDER BY created_at DESC
         LIMIT 50`,
        [tenantId],
      );

      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        alertType: row.alert_type,
        severity: row.severity,
        title: row.title,
        message: row.message,
        data: row.data,
        acknowledged: row.acknowledged,
        createdAt: row.created_at,
      }));
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE alerts_history 
         SET acknowledged = true, acknowledged_by = $2, acknowledged_at = NOW()
         WHERE id = $1`,
        [alertId, userId],
      );
    } catch (error: any) {
      this.logger.error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfig(config: Partial<AlertConfig> & { tenantId: number; alertType: string }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO alert_configurations (tenant_id, alert_type, channels, threshold, recipients, webhook_url, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, alert_type) DO UPDATE SET
           channels = COALESCE($3, alert_configurations.channels),
           threshold = COALESCE($4, alert_configurations.threshold),
           recipients = COALESCE($5, alert_configurations.recipients),
           webhook_url = COALESCE($6, alert_configurations.webhook_url),
           is_enabled = COALESCE($7, alert_configurations.is_enabled),
           updated_at = NOW()`,
        [
          config.tenantId,
          config.alertType,
          config.channels,
          config.threshold,
          config.recipients,
          config.webhookUrl,
          config.isEnabled,
        ],
      );
    } catch (error: any) {
      this.logger.error(`Failed to update alert config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(tenantId: number, days: number = 30): Promise<{
    totalAlerts: number;
    byType: Array<{ type: string; count: number }>;
    bySeverity: Array<{ severity: string; count: number }>;
    unacknowledged: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const total = await this.pool.query(
        `SELECT COUNT(*) FROM alerts_history WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, startDate],
      );

      const byType = await this.pool.query(
        `SELECT alert_type as type, COUNT(*) as count 
         FROM alerts_history WHERE tenant_id = $1 AND created_at >= $2
         GROUP BY alert_type ORDER BY count DESC`,
        [tenantId, startDate],
      );

      const bySeverity = await this.pool.query(
        `SELECT severity, COUNT(*) as count 
         FROM alerts_history WHERE tenant_id = $1 AND created_at >= $2
         GROUP BY severity ORDER BY count DESC`,
        [tenantId, startDate],
      );

      const unack = await this.pool.query(
        `SELECT COUNT(*) FROM alerts_history WHERE tenant_id = $1 AND acknowledged = false`,
        [tenantId],
      );

      return {
        totalAlerts: parseInt(total.rows[0]?.count || '0'),
        byType: byType.rows.map(r => ({ type: r.type, count: parseInt(r.count) })),
        bySeverity: bySeverity.rows.map(r => ({ severity: r.severity, count: parseInt(r.count) })),
        unacknowledged: parseInt(unack.rows[0]?.count || '0'),
      };
    } catch (error: any) {
      return { totalAlerts: 0, byType: [], bySeverity: [], unacknowledged: 0 };
    }
  }

  /**
   * Daily summary cron job (placeholder)
   */
  // @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailySummaries(): Promise<void> {
    this.logger.log('📊 Sending daily usage summaries...');
    // TODO: Implement daily summary email for each tenant
  }
}
