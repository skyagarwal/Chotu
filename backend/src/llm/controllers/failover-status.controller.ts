import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmUsageTrackingService } from '../services/llm-usage-tracking.service';

interface ProviderStatus {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  status: 'active' | 'inactive' | 'error';
  priority: number;
  enabled: boolean;
  hasApiKey: boolean;
  avgLatency?: number;
  successRate?: number;
  cost?: string;
  lastUsed?: string;
  totalRequests?: number;
  failedRequests?: number;
}

@Controller('llm')
export class FailoverStatusController {
  constructor(
    private readonly config: ConfigService,
    private readonly usageTracking: LlmUsageTrackingService,
  ) {}

  @Get('failover-status')
  async getFailoverStatus(): Promise<{ providers: ProviderStatus[]; chain: string[] }> {
    const enabledProviders = (this.config.get('ENABLED_LLM_PROVIDERS') || 'groq,openrouter').split(',');
    const defaultProvider = this.config.get('DEFAULT_CLOUD_PROVIDER') || 'auto';

    // Check which API keys are configured
    const hasGroqKey = !!this.config.get('GROQ_API_KEY');
    const hasOpenRouterKey = !!this.config.get('OPENROUTER_API_KEY');
    const hasOpenAIKey = !!this.config.get('OPENAI_API_KEY');
    const hasHuggingFaceKey = !!this.config.get('HUGGINGFACE_API_KEY');

    // Get usage stats from tracking service
    const stats = await this.getUsageStats();

    const providers: ProviderStatus[] = [
      {
        id: 'vllm',
        name: 'vLLM (Local)',
        type: 'local',
        status: 'active', // Always try vLLM first
        priority: 1,
        enabled: true,
        hasApiKey: true, // No API key needed for local
        avgLatency: stats.vllm?.avgLatency,
        successRate: stats.vllm?.successRate,
        cost: 'Free',
        lastUsed: stats.vllm?.lastUsed,
        totalRequests: stats.vllm?.total || 0,
        failedRequests: stats.vllm?.failed || 0,
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        type: 'cloud',
        status: hasOpenRouterKey && enabledProviders.includes('openrouter') ? 'active' : 'inactive',
        priority: 2,
        enabled: enabledProviders.includes('openrouter'),
        hasApiKey: hasOpenRouterKey,
        avgLatency: stats.openrouter?.avgLatency,
        successRate: stats.openrouter?.successRate,
        cost: '$0.0002-$0.01/1K tokens',
        lastUsed: stats.openrouter?.lastUsed,
        totalRequests: stats.openrouter?.total || 0,
        failedRequests: stats.openrouter?.failed || 0,
      },
      {
        id: 'groq',
        name: 'Groq',
        type: 'cloud',
        status: hasGroqKey && enabledProviders.includes('groq') ? 'active' : 'inactive',
        priority: 3,
        enabled: enabledProviders.includes('groq'),
        hasApiKey: hasGroqKey,
        avgLatency: stats.groq?.avgLatency,
        successRate: stats.groq?.successRate,
        cost: 'Free (Rate Limited)',
        lastUsed: stats.groq?.lastUsed,
        totalRequests: stats.groq?.total || 0,
        failedRequests: stats.groq?.failed || 0,
      },
      {
        id: 'openai',
        name: 'OpenAI',
        type: 'cloud',
        status: hasOpenAIKey && enabledProviders.includes('openai') ? 'active' : 'inactive',
        priority: 4,
        enabled: enabledProviders.includes('openai'),
        hasApiKey: hasOpenAIKey,
        avgLatency: stats.openai?.avgLatency,
        successRate: stats.openai?.successRate,
        cost: '$0.01-$0.06/1K tokens',
        lastUsed: stats.openai?.lastUsed,
        totalRequests: stats.openai?.total || 0,
        failedRequests: stats.openai?.failed || 0,
      },
      {
        id: 'huggingface',
        name: 'HuggingFace',
        type: 'cloud',
        status: hasHuggingFaceKey && enabledProviders.includes('huggingface') ? 'active' : 'inactive',
        priority: 5,
        enabled: enabledProviders.includes('huggingface'),
        hasApiKey: hasHuggingFaceKey,
        avgLatency: stats.huggingface?.avgLatency,
        successRate: stats.huggingface?.successRate,
        cost: 'Free',
        lastUsed: stats.huggingface?.lastUsed,
        totalRequests: stats.huggingface?.total || 0,
        failedRequests: stats.huggingface?.failed || 0,
      },
    ];

    // Build failover chain based on active providers
    const chain: string[] = [];
    if (defaultProvider === 'auto' || defaultProvider === 'vllm') {
      chain.push('vLLM (Local)');
    }
    providers
      .filter(p => p.status === 'active' && p.type === 'cloud')
      .sort((a, b) => a.priority - b.priority)
      .forEach(p => chain.push(p.name));

    return {
      providers,
      chain,
    };
  }

  private async getUsageStats(): Promise<any> {
    // Get last 1000 requests from usage tracking
    const recentUsage = await this.usageTracking.getRecentUsage(1000);
    
    const stats: any = {};
    
    ['vllm', 'openrouter', 'groq', 'openai', 'huggingface'].forEach(provider => {
      const providerUsage = recentUsage.filter(u => u.provider === provider);
      
      if (providerUsage.length > 0) {
        const successful = providerUsage.filter(u => u.status === 'success');
        const failed = providerUsage.filter(u => u.status === 'error');
        
        stats[provider] = {
          total: providerUsage.length,
          failed: failed.length,
          avgLatency: Math.round(
            successful.reduce((sum, u) => sum + u.latencyMs, 0) / successful.length
          ),
          successRate: Math.round((successful.length / providerUsage.length) * 100),
          lastUsed: this.formatLastUsed(providerUsage[0].createdAt),
        };
      }
    });
    
    return stats;
  }

  private formatLastUsed(date: Date): string {
    const now = Date.now();
    const diffMs = now - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}
