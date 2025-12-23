/**
 * LLM API Service
 * Handles all API calls to the mangwale-ai backend LLM endpoints
 */

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_MANGWALE_AI_URL || 'http://localhost:3200';
};

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  cost: 'free' | 'paid';
  purpose: string[];
  capabilities: {
    chat: boolean;
    completion: boolean;
    functions: boolean;
    vision: boolean;
    streaming: boolean;
  };
  pricing?: {
    input: number;
    output: number;
    currency: string;
    free?: boolean;
  };
  contextLength?: number;
  languages?: string[];
  description?: string;
}

export interface ProviderStats {
  name: string;
  modelCount: number;
  freeModels: number;
  paidModels: number;
  freeModelsWithIndianLanguages: number;
  capabilities: string[];
}

export interface UsageAnalytics {
  performance: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    timeoutCount: number;
    successRate: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    providerPerformance: Array<{
      provider: string;
      requestCount: number;
      averageLatency: number;
    }>;
  };
  popularModels: Array<{
    modelId: string;
    modelName: string;
    provider: string;
    usageCount: number;
    totalCost: number;
    totalTokens: number;
  }>;
  costTrends: Array<{
    date: string;
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
  }>;
}

export interface ModelUsageStats {
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
}

export interface ProviderUsageStats {
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  topModels: Array<{
    modelId: string;
    count: number;
  }>;
}

class LlmApiService {
  private get baseUrl(): string {
    return `${getBaseUrl()}/llm`;
  }

  constructor() {}

  /**
   * Get all available models with optional filters
   */
  async getModels(params?: {
    provider?: string;
    cost?: 'free' | 'paid';
    purpose?: string;
    refresh?: boolean;
  }): Promise<{ models: ModelInfo[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.append('provider', params.provider);
    if (params?.cost) queryParams.append('cost', params.cost);
    if (params?.purpose) queryParams.append('purpose', params.purpose);
    if (params?.refresh) queryParams.append('refresh', 'true');

    const url = `${this.baseUrl}/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get model details by ID
   */
  async getModelById(modelId: string): Promise<ModelInfo> {
    const response = await fetch(
      `${this.baseUrl}/models/${encodeURIComponent(modelId)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all free models
   */
  async getFreeModels(): Promise<{ models: ModelInfo[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/models/free/all`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch free models: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get free models with Indian language support
   */
  async getFreeIndianLanguageModels(): Promise<{
    models: ModelInfo[];
    count: number;
    languages: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/models/free/indian-languages`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Indian language models: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get models by purpose
   */
  async getModelsByPurpose(purpose: string): Promise<{
    models: ModelInfo[];
    count: number;
  }> {
    const response = await fetch(`${this.baseUrl}/models/purpose/${purpose}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models by purpose: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get provider statistics
   */
  async getProviders(): Promise<{ providers: ProviderStats[] }> {
    const response = await fetch(`${this.baseUrl}/providers`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Estimate cost for a request
   */
  async estimateCost(params: {
    tokens: number;
    model: string;
  }): Promise<{
    estimatedCost: number;
    breakdown?: {
      inputCost: number;
      outputCost: number;
      currency: string;
      model: string;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/estimate-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to estimate cost: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(params?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<UsageAnalytics> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/usage${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get cost analytics with time grouping
   */
  async getCostAnalytics(params?: {
    groupBy?: 'day' | 'week' | 'month';
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    date: string;
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/costs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cost analytics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get popular models
   */
  async getPopularModels(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    modelId: string;
    modelName: string;
    provider: string;
    usageCount: number;
    totalCost: number;
    totalTokens: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/popular-models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch popular models: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<UsageAnalytics['performance']> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/performance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch performance metrics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get model-specific analytics
   */
  async getModelAnalytics(
    modelId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ModelUsageStats> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/model/${encodeURIComponent(modelId)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model analytics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get provider-specific analytics
   */
  async getProviderAnalytics(
    provider: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ProviderUsageStats> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = `${this.baseUrl}/analytics/provider/${provider}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch provider analytics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check LLM service health
   */
  async checkHealth(): Promise<{ status: string; providers: string[] }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Failed to check health: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get local vLLM model info
   */
  async getLocalVllmInfo(): Promise<ModelInfo | null> {
    try {
      const response = await fetch('http://localhost:8002/v1/models');
      if (!response.ok) return null;
      
      const data = await response.json();
      const model = data.data?.[0];
      if (!model) return null;

      // Create ModelInfo from vLLM response
      return {
        id: model.id,
        name: model.id.split('/').pop() || model.id,
        provider: 'vllm-local',
        cost: 'free' as const,
        purpose: ['chat', 'completion', 'reasoning'],
        capabilities: {
          chat: true,
          completion: true,
          functions: true,
          vision: false,
          streaming: true,
        },
        contextLength: 4096, // From our docker-compose config
        languages: ['English', 'Hindi', 'Chinese'], // Qwen supports these
        description: `Local vLLM instance running ${model.id} - GPU-accelerated inference on RTX 3060`,
      };
    } catch (error) {
      console.error('Failed to fetch local vLLM info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const llmApi = new LlmApiService();
