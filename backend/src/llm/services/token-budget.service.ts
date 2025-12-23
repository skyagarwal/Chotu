import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

/**
 * 💰 Token Budget Manager
 * 
 * Manages token/cost budgets per tenant:
 * - Daily/monthly token limits
 * - Cost caps with alerts
 * - Usage tracking and forecasting
 * - Overage handling (block, throttle, notify)
 * 
 * Features:
 * - Real-time budget tracking
 * - Usage alerts at 80%, 90%, 100%
 * - Rollover unused tokens (optional)
 * - Emergency budget reserve
 */

export interface TenantBudget {
  tenantId: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  dailyCostLimit: number;
  monthlyCostLimit: number;
  usedTokensToday: number;
  usedTokensThisMonth: number;
  usedCostToday: number;
  usedCostThisMonth: number;
  overageAction: 'block' | 'throttle' | 'notify';
  alertThresholds: number[]; // e.g., [80, 90, 100]
}

export interface UsageRecord {
  tenantId: number;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

@Injectable()
export class TokenBudgetService implements OnModuleInit {
  private readonly logger = new Logger(TokenBudgetService.name);
  private pool: Pool;
  private budgetCache: Map<number, TenantBudget> = new Map();
  private cacheExpiry: Map<number, Date> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('💰 TokenBudgetService initializing...');
  }

  async onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL') ||
      'postgresql://mangwale_config:config_secure_pass_2024@mangwale_postgres:5432/headless_mangwale?schema=public';

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
    });

    try {
      const client = await this.pool.connect();

      await client.query(`
        -- Tenant budgets and limits
        CREATE TABLE IF NOT EXISTS tenant_budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL UNIQUE,
          daily_token_limit INTEGER DEFAULT 100000,
          monthly_token_limit INTEGER DEFAULT 2000000,
          daily_cost_limit DECIMAL(10, 4) DEFAULT 10.00,
          monthly_cost_limit DECIMAL(10, 4) DEFAULT 200.00,
          overage_action VARCHAR(20) DEFAULT 'notify', -- block, throttle, notify
          alert_thresholds INTEGER[] DEFAULT ARRAY[80, 90, 100],
          rollover_enabled BOOLEAN DEFAULT false,
          emergency_reserve_percent INTEGER DEFAULT 10,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Daily usage tracking
        CREATE TABLE IF NOT EXISTS tenant_daily_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          date DATE NOT NULL,
          total_tokens INTEGER DEFAULT 0,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          total_cost DECIMAL(10, 6) DEFAULT 0,
          request_count INTEGER DEFAULT 0,
          model_breakdown JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, date)
        );

        CREATE INDEX IF NOT EXISTS idx_daily_usage_tenant ON tenant_daily_usage(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON tenant_daily_usage(date);

        -- Budget alerts log
        CREATE TABLE IF NOT EXISTS budget_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id INTEGER NOT NULL,
          alert_type VARCHAR(50) NOT NULL, -- budget_warning, budget_exceeded, daily_limit, monthly_limit
          threshold_percent INTEGER,
          current_usage DECIMAL(12, 4),
          limit_value DECIMAL(12, 4),
          message TEXT,
          acknowledged BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON budget_alerts(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON budget_alerts(created_at);
      `);

      client.release();
      this.logger.log('✅ TokenBudgetService initialized');
    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Check if request is within budget
   */
  async checkBudget(tenantId: number, estimatedTokens: number, estimatedCost: number): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: { tokens: number; cost: number };
    usagePercent: number;
  }> {
    const budget = await this.getTenantBudget(tenantId);

    // Calculate remaining
    const remainingTokens = budget.dailyTokenLimit - budget.usedTokensToday;
    const remainingCost = budget.dailyCostLimit - budget.usedCostToday;
    const usagePercent = Math.max(
      (budget.usedTokensToday / budget.dailyTokenLimit) * 100,
      (budget.usedCostToday / budget.dailyCostLimit) * 100,
    );

    // Check if over budget
    const overTokens = budget.usedTokensToday + estimatedTokens > budget.dailyTokenLimit;
    const overCost = budget.usedCostToday + estimatedCost > budget.dailyCostLimit;

    if (overTokens || overCost) {
      switch (budget.overageAction) {
        case 'block':
          await this.createAlert(tenantId, 'budget_exceeded', 100, budget.usedCostToday, budget.dailyCostLimit);
          return {
            allowed: false,
            reason: `Daily ${overTokens ? 'token' : 'cost'} limit exceeded. Please try again tomorrow.`,
            remaining: { tokens: Math.max(0, remainingTokens), cost: Math.max(0, remainingCost) },
            usagePercent: Math.min(100, usagePercent),
          };

        case 'throttle':
          // Allow but with delay (handled by caller)
          await this.createAlert(tenantId, 'budget_warning', 100, budget.usedCostToday, budget.dailyCostLimit);
          return {
            allowed: true,
            reason: 'Budget exceeded, request throttled',
            remaining: { tokens: 0, cost: 0 },
            usagePercent: 100,
          };

        case 'notify':
        default:
          await this.createAlert(tenantId, 'budget_warning', 100, budget.usedCostToday, budget.dailyCostLimit);
          return {
            allowed: true,
            reason: 'Budget exceeded, continuing with notification',
            remaining: { tokens: Math.max(0, remainingTokens), cost: Math.max(0, remainingCost) },
            usagePercent: Math.min(100, usagePercent),
          };
      }
    }

    // Check alert thresholds
    for (const threshold of budget.alertThresholds) {
      if (usagePercent >= threshold) {
        await this.createAlert(tenantId, 'budget_warning', threshold, budget.usedCostToday, budget.dailyCostLimit);
        break;
      }
    }

    return {
      allowed: true,
      remaining: { tokens: remainingTokens, cost: remainingCost },
      usagePercent,
    };
  }

  /**
   * Record token usage
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    const totalTokens = record.inputTokens + record.outputTokens;
    const today = new Date().toISOString().split('T')[0];

    try {
      // Update daily usage
      await this.pool.query(
        `INSERT INTO tenant_daily_usage (tenant_id, date, total_tokens, input_tokens, output_tokens, total_cost, request_count, model_breakdown)
         VALUES ($1, $2, $3, $4, $5, $6, 1, jsonb_build_object($7, jsonb_build_object('tokens', $3, 'cost', $6, 'requests', 1)))
         ON CONFLICT (tenant_id, date) DO UPDATE SET
           total_tokens = tenant_daily_usage.total_tokens + $3,
           input_tokens = tenant_daily_usage.input_tokens + $4,
           output_tokens = tenant_daily_usage.output_tokens + $5,
           total_cost = tenant_daily_usage.total_cost + $6,
           request_count = tenant_daily_usage.request_count + 1,
           model_breakdown = tenant_daily_usage.model_breakdown || 
             jsonb_build_object($7, 
               COALESCE(tenant_daily_usage.model_breakdown->$7, '{}'::jsonb) ||
               jsonb_build_object(
                 'tokens', COALESCE((tenant_daily_usage.model_breakdown->$7->>'tokens')::int, 0) + $3,
                 'cost', COALESCE((tenant_daily_usage.model_breakdown->$7->>'cost')::numeric, 0) + $6,
                 'requests', COALESCE((tenant_daily_usage.model_breakdown->$7->>'requests')::int, 0) + 1
               )
             )`,
        [record.tenantId, today, totalTokens, record.inputTokens, record.outputTokens, record.cost, record.modelId],
      );

      // Invalidate cache
      this.budgetCache.delete(record.tenantId);
      this.cacheExpiry.delete(record.tenantId);
    } catch (error: any) {
      this.logger.error(`Failed to record usage: ${error.message}`);
    }
  }

  /**
   * Get tenant's current budget status
   */
  async getTenantBudget(tenantId: number): Promise<TenantBudget> {
    // Check cache
    const cached = this.budgetCache.get(tenantId);
    const expiry = this.cacheExpiry.get(tenantId);
    if (cached && expiry && expiry > new Date()) {
      return cached;
    }

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    try {
      // Get budget limits
      const budgetResult = await this.pool.query(
        `SELECT * FROM tenant_budgets WHERE tenant_id = $1`,
        [tenantId],
      );

      // Get today's usage
      const todayUsage = await this.pool.query(
        `SELECT COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(total_cost), 0) as cost
         FROM tenant_daily_usage WHERE tenant_id = $1 AND date = $2`,
        [tenantId, today],
      );

      // Get this month's usage
      const monthUsage = await this.pool.query(
        `SELECT COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(total_cost), 0) as cost
         FROM tenant_daily_usage WHERE tenant_id = $1 AND date >= $2`,
        [tenantId, monthStart],
      );

      const budget: TenantBudget = {
        tenantId,
        dailyTokenLimit: budgetResult.rows[0]?.daily_token_limit || 100000,
        monthlyTokenLimit: budgetResult.rows[0]?.monthly_token_limit || 2000000,
        dailyCostLimit: parseFloat(budgetResult.rows[0]?.daily_cost_limit || '10'),
        monthlyCostLimit: parseFloat(budgetResult.rows[0]?.monthly_cost_limit || '200'),
        usedTokensToday: parseInt(todayUsage.rows[0]?.tokens || '0'),
        usedTokensThisMonth: parseInt(monthUsage.rows[0]?.tokens || '0'),
        usedCostToday: parseFloat(todayUsage.rows[0]?.cost || '0'),
        usedCostThisMonth: parseFloat(monthUsage.rows[0]?.cost || '0'),
        overageAction: budgetResult.rows[0]?.overage_action || 'notify',
        alertThresholds: budgetResult.rows[0]?.alert_thresholds || [80, 90, 100],
      };

      // Cache for 1 minute
      this.budgetCache.set(tenantId, budget);
      this.cacheExpiry.set(tenantId, new Date(Date.now() + 60000));

      return budget;
    } catch (error: any) {
      this.logger.error(`Failed to get budget: ${error.message}`);
      return {
        tenantId,
        dailyTokenLimit: 100000,
        monthlyTokenLimit: 2000000,
        dailyCostLimit: 10,
        monthlyCostLimit: 200,
        usedTokensToday: 0,
        usedTokensThisMonth: 0,
        usedCostToday: 0,
        usedCostThisMonth: 0,
        overageAction: 'notify',
        alertThresholds: [80, 90, 100],
      };
    }
  }

  /**
   * Update tenant budget limits
   */
  async updateBudgetLimits(
    tenantId: number,
    limits: Partial<{
      dailyTokenLimit: number;
      monthlyTokenLimit: number;
      dailyCostLimit: number;
      monthlyCostLimit: number;
      overageAction: 'block' | 'throttle' | 'notify';
      alertThresholds: number[];
    }>,
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (limits.dailyTokenLimit !== undefined) {
      updates.push(`daily_token_limit = $${paramIndex++}`);
      values.push(limits.dailyTokenLimit);
    }
    if (limits.monthlyTokenLimit !== undefined) {
      updates.push(`monthly_token_limit = $${paramIndex++}`);
      values.push(limits.monthlyTokenLimit);
    }
    if (limits.dailyCostLimit !== undefined) {
      updates.push(`daily_cost_limit = $${paramIndex++}`);
      values.push(limits.dailyCostLimit);
    }
    if (limits.monthlyCostLimit !== undefined) {
      updates.push(`monthly_cost_limit = $${paramIndex++}`);
      values.push(limits.monthlyCostLimit);
    }
    if (limits.overageAction !== undefined) {
      updates.push(`overage_action = $${paramIndex++}`);
      values.push(limits.overageAction);
    }
    if (limits.alertThresholds !== undefined) {
      updates.push(`alert_thresholds = $${paramIndex++}`);
      values.push(limits.alertThresholds);
    }

    if (updates.length === 0) return;

    try {
      await this.pool.query(
        `INSERT INTO tenant_budgets (tenant_id, ${Object.keys(limits).join(', ')})
         VALUES ($1, ${values.slice(1).map((_, i) => `$${i + 2}`).join(', ')})
         ON CONFLICT (tenant_id) DO UPDATE SET ${updates.join(', ')}, updated_at = NOW()`,
        values,
      );

      // Invalidate cache
      this.budgetCache.delete(tenantId);
      this.cacheExpiry.delete(tenantId);
    } catch (error: any) {
      this.logger.error(`Failed to update budget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create budget alert
   */
  private async createAlert(
    tenantId: number,
    alertType: string,
    threshold: number,
    currentUsage: number,
    limit: number,
  ): Promise<void> {
    const message = `Budget alert: ${threshold}% of ${alertType.replace('_', ' ')} reached. Current: ₹${currentUsage.toFixed(2)} / ₹${limit.toFixed(2)}`;

    try {
      // Check if similar alert exists in last hour
      const existing = await this.pool.query(
        `SELECT id FROM budget_alerts 
         WHERE tenant_id = $1 AND alert_type = $2 AND threshold_percent = $3
         AND created_at >= NOW() - INTERVAL '1 hour'`,
        [tenantId, alertType, threshold],
      );

      if (existing.rows.length === 0) {
        await this.pool.query(
          `INSERT INTO budget_alerts (tenant_id, alert_type, threshold_percent, current_usage, limit_value, message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [tenantId, alertType, threshold, currentUsage, limit, message],
        );

        this.logger.warn(`⚠️ ${message} (Tenant: ${tenantId})`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to create alert: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(tenantId: number, days: number = 30): Promise<{
    daily: Array<{ date: string; tokens: number; cost: number; requests: number }>;
    byModel: Array<{ model: string; tokens: number; cost: number; requests: number }>;
    forecast: { nextMonthCost: number; trend: 'increasing' | 'stable' | 'decreasing' };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const daily = await this.pool.query(
        `SELECT date, total_tokens, total_cost, request_count, model_breakdown
         FROM tenant_daily_usage
         WHERE tenant_id = $1 AND date >= $2
         ORDER BY date DESC`,
        [tenantId, startDate.toISOString().split('T')[0]],
      );

      // Aggregate by model
      const modelTotals: Record<string, { tokens: number; cost: number; requests: number }> = {};
      for (const row of daily.rows) {
        if (row.model_breakdown) {
          for (const [model, stats] of Object.entries(row.model_breakdown as Record<string, any>)) {
            if (!modelTotals[model]) {
              modelTotals[model] = { tokens: 0, cost: 0, requests: 0 };
            }
            modelTotals[model].tokens += stats.tokens || 0;
            modelTotals[model].cost += stats.cost || 0;
            modelTotals[model].requests += stats.requests || 0;
          }
        }
      }

      // Calculate trend
      const costs = daily.rows.map(r => parseFloat(r.total_cost));
      const trend = this.calculateTrend(costs);

      // Forecast next month
      const avgDailyCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
      const nextMonthCost = avgDailyCost * 30 * (trend === 'increasing' ? 1.2 : trend === 'decreasing' ? 0.8 : 1);

      return {
        daily: daily.rows.map(r => ({
          date: r.date.toISOString().split('T')[0],
          tokens: parseInt(r.total_tokens),
          cost: parseFloat(r.total_cost),
          requests: parseInt(r.request_count),
        })),
        byModel: Object.entries(modelTotals).map(([model, stats]) => ({
          model,
          ...stats,
        })),
        forecast: {
          nextMonthCost: parseFloat(nextMonthCost.toFixed(2)),
          trend,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get usage stats: ${error.message}`);
      return {
        daily: [],
        byModel: [],
        forecast: { nextMonthCost: 0, trend: 'stable' },
      };
    }
  }

  /**
   * Calculate usage trend
   */
  private calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 7) return 'stable';

    const recent = values.slice(0, 7);
    const older = values.slice(7, 14);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = (recentAvg - olderAvg) / (olderAvg || 1);

    if (change > 0.15) return 'increasing';
    if (change < -0.15) return 'decreasing';
    return 'stable';
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(tenantId: number): Promise<Array<{
    id: string;
    type: string;
    message: string;
    createdAt: Date;
  }>> {
    try {
      const result = await this.pool.query(
        `SELECT id, alert_type, message, created_at
         FROM budget_alerts
         WHERE tenant_id = $1 AND acknowledged = false
         ORDER BY created_at DESC
         LIMIT 20`,
        [tenantId],
      );

      return result.rows.map(r => ({
        id: r.id,
        type: r.alert_type,
        message: r.message,
        createdAt: r.created_at,
      }));
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE budget_alerts SET acknowledged = true WHERE id = $1`,
        [alertId],
      );
    } catch (error: any) {
      this.logger.error(`Failed to acknowledge alert: ${error.message}`);
    }
  }
}
