import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'vllm' | 'openai' | 'groq' | 'openrouter' | 'huggingface' | 'together' | 'deepseek';
  type: 'local' | 'cloud';
  cost: 'free' | 'paid';
  pricing?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
    currency: string;
  };
  capabilities: {
    chat: boolean;
    completion: boolean;
    streaming: boolean;
    functionCalling?: boolean;
    vision?: boolean;
    embedding?: boolean;
  };
  contextLength: number;
  description: string;
  purpose: string[]; // e.g., ['chat', 'code', 'creative-writing', 'reasoning']
  languages?: string[];
  performance?: {
    speed: 'fast' | 'medium' | 'slow';
    quality: 'high' | 'medium' | 'low';
  };
  limits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    dailyLimit?: number;
  };
  deprecated?: boolean;
  replacedBy?: string;
}

@Injectable()
export class ModelRegistryService {
  private readonly logger = new Logger(ModelRegistryService.name);
  private modelCache: ModelInfo[] = [];
  private lastFetch: Date | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(private readonly config: ConfigService) {}

  async getAllModels(forceRefresh = false): Promise<ModelInfo[]> {
    const now = new Date();
    
    if (!forceRefresh && this.lastFetch && (now.getTime() - this.lastFetch.getTime()) < this.CACHE_TTL) {
      return this.modelCache;
    }

    this.logger.log('Fetching models from all providers...');
    
    const models: ModelInfo[] = [];

    // Fetch from each provider in parallel
    const results = await Promise.allSettled([
      this.fetchGroqModels(),
      this.fetchOpenRouterModels(),
      this.fetchOpenAIModels(),
      this.fetchHuggingFaceModels(),
    ]);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        models.push(...result.value);
      } else {
        const providers = ['Groq', 'OpenRouter', 'OpenAI', 'HuggingFace'];
        this.logger.warn(`Failed to fetch ${providers[index]} models: ${result.reason}`);
      }
    });

    this.modelCache = models;
    this.lastFetch = now;

    return models;
  }

  async getModelsByProvider(provider: string): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.provider === provider);
  }

  async getFreeModels(): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.cost === 'free');
  }

  async getModelsByPurpose(purpose: string): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.purpose.includes(purpose));
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const allModels = await this.getAllModels();
    return allModels.find(m => m.id === modelId) || null;
  }

  async getFreeModelsWithIndianLanguages(): Promise<ModelInfo[]> {
    const freeModels = await this.getFreeModels();
    const indianLanguages = ['hindi', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'kannada', 'malayalam', 'punjabi', 'urdu', 'odia', 'assamese'];
    
    return freeModels.filter(model => {
      if (!model.languages || model.languages.length === 0) return false;
      return model.languages.some(lang => 
        indianLanguages.includes(lang.toLowerCase())
      );
    });
  }

  private async fetchGroqModels(): Promise<ModelInfo[]> {
    const apiKey = this.config.get('GROQ_API_KEY');
    if (!apiKey) return [];

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const response = await client.models.list();
      
      return response.data.map(model => this.mapGroqModel(model));
    } catch (error) {
      this.logger.warn(`Groq models fetch failed: ${error.message}`);
      return this.getStaticGroqModels();
    }
  }

  private mapGroqModel(model: any): ModelInfo {
    const modelMap: Record<string, Partial<ModelInfo>> = {
      'llama-3.1-8b-instant': {
        contextLength: 128000,
        description: 'Fast Llama 3.1 model optimized for speed with 8B parameters',
        purpose: ['chat', 'general', 'fast-response'],
        performance: { speed: 'fast', quality: 'medium' },
        pricing: { input: 0.05, output: 0.08, currency: 'USD' },
      },
      'llama-3.1-70b-versatile': {
        contextLength: 128000,
        description: 'Large Llama 3.1 model for complex reasoning with 70B parameters',
        purpose: ['chat', 'reasoning', 'complex-tasks'],
        performance: { speed: 'medium', quality: 'high' },
        pricing: { input: 0.59, output: 0.79, currency: 'USD' },
      },
      'mixtral-8x7b-32768': {
        contextLength: 32768,
        description: 'Mixture of Experts model with 8x7B architecture',
        purpose: ['chat', 'code', 'multilingual'],
        performance: { speed: 'fast', quality: 'high' },
        pricing: { input: 0.24, output: 0.24, currency: 'USD' },
      },
      'gemma-7b-it': {
        contextLength: 8192,
        description: 'Google Gemma instruction-tuned model',
        purpose: ['chat', 'general'],
        performance: { speed: 'fast', quality: 'medium' },
        pricing: { input: 0.07, output: 0.07, currency: 'USD' },
      },
    };

    const defaults = modelMap[model.id] || {
      contextLength: 8192,
      description: 'Groq model',
      purpose: ['chat'],
      performance: { speed: 'fast', quality: 'medium' },
      pricing: { input: 0.1, output: 0.1, currency: 'USD' },
    };

    return {
      id: model.id,
      name: model.id,
      provider: 'groq',
      type: 'cloud',
      cost: 'free',
      contextLength: defaults.contextLength,
      description: defaults.description,
      purpose: defaults.purpose,
      performance: defaults.performance,
      pricing: defaults.pricing,
      capabilities: {
        chat: true,
        completion: true,
        streaming: true,
        functionCalling: false,
      },
      limits: {
        requestsPerMinute: 30,
        tokensPerMinute: 14400,
      },
    };
  }

  private getStaticGroqModels(): ModelInfo[] {
    return [
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'groq',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0.05, output: 0.08, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
        },
        contextLength: 128000,
        description: 'Fast Llama 3.1 model optimized for speed',
        purpose: ['chat', 'general', 'fast-response'],
        languages: ['english', 'hindi', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'kannada', 'malayalam', 'punjabi'],
        performance: { speed: 'fast', quality: 'medium' },
        limits: { requestsPerMinute: 30, tokensPerMinute: 14400 },
      },
      {
        id: 'llama-3.1-70b-versatile',
        name: 'Llama 3.1 70B Versatile',
        provider: 'groq',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0.59, output: 0.79, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
        },
        contextLength: 128000,
        description: 'Large Llama 3.1 model for complex reasoning',
        purpose: ['chat', 'reasoning', 'complex-tasks'],
        languages: ['english', 'hindi', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'kannada', 'malayalam', 'punjabi'],
        performance: { speed: 'medium', quality: 'high' },
        limits: { requestsPerMinute: 30, tokensPerMinute: 6000 },
      },
    ];
  }

  private async fetchOpenRouterModels(): Promise<ModelInfo[]> {
    const apiKey = this.config.get('OPENROUTER_API_KEY');
    if (!apiKey) return [];

    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return response.data.data.map(model => this.mapOpenRouterModel(model));
    } catch (error) {
      this.logger.warn(`OpenRouter models fetch failed: ${error.message}`);
      return this.getStaticOpenRouterModels();
    }
  }

  private mapOpenRouterModel(model: any): ModelInfo {
    const isFree = model.id.includes(':free') || model.pricing?.prompt === 0;
    
    return {
      id: model.id,
      name: model.name || model.id,
      provider: 'openrouter',
      type: 'cloud',
      cost: isFree ? 'free' : 'paid',
      pricing: model.pricing ? {
        input: parseFloat(model.pricing.prompt) * 1000000, // Convert to per 1M
        output: parseFloat(model.pricing.completion) * 1000000,
        currency: 'USD',
      } : undefined,
      capabilities: {
        chat: true,
        completion: true,
        streaming: true,
        functionCalling: model.supports_function_calling,
        vision: model.architecture?.modality === 'multimodal',
      },
      contextLength: model.context_length || 8192,
      description: model.description || `${model.name} via OpenRouter`,
      purpose: this.inferPurpose(model),
      performance: {
        speed: model.top_provider?.is_moderated ? 'fast' : 'medium',
        quality: model.id.includes('70b') || model.id.includes('claude') ? 'high' : 'medium',
      },
    };
  }

  private inferPurpose(model: any): string[] {
    const purposes: string[] = ['chat'];
    const id = model.id.toLowerCase();
    const name = (model.name || '').toLowerCase();

    if (id.includes('code') || name.includes('code')) purposes.push('code');
    if (id.includes('instruct') || name.includes('instruct')) purposes.push('instruction-following');
    if (id.includes('vision') || model.architecture?.modality === 'multimodal') purposes.push('vision');
    if (id.includes('claude') || id.includes('gpt-4')) purposes.push('reasoning', 'complex-tasks');
    if (id.includes('creative') || name.includes('creative')) purposes.push('creative-writing');

    return purposes;
  }

  private getStaticOpenRouterModels(): ModelInfo[] {
    return [
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B Instruct (Free)',
        provider: 'openrouter',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0, output: 0, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
        },
        contextLength: 131072,
        description: 'Free Llama 3.2 model optimized for instruction following',
        purpose: ['chat', 'general', 'instruction-following'],
        performance: { speed: 'fast', quality: 'medium' },
      },
      {
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B IT (Free)',
        provider: 'openrouter',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0, output: 0, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
        },
        contextLength: 8192,
        description: 'Free Google Gemma 2 instruction-tuned model',
        purpose: ['chat', 'general'],
        performance: { speed: 'fast', quality: 'medium' },
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct:free',
        name: 'Phi-3 Mini 128K Instruct (Free)',
        provider: 'openrouter',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0, output: 0, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
        },
        contextLength: 128000,
        description: 'Free Microsoft Phi-3 model with 128K context',
        purpose: ['chat', 'reasoning', 'code'],
        performance: { speed: 'fast', quality: 'high' },
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'openrouter',
        type: 'cloud',
        cost: 'paid',
        pricing: { input: 15, output: 75, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
          functionCalling: true,
          vision: true,
        },
        contextLength: 200000,
        description: 'Top-tier Claude model for complex reasoning and analysis',
        purpose: ['chat', 'reasoning', 'complex-tasks', 'vision', 'code'],
        performance: { speed: 'medium', quality: 'high' },
      },
    ];
  }

  private async fetchOpenAIModels(): Promise<ModelInfo[]> {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey) return [];

    try {
      const client = new OpenAI({ apiKey });
      const response = await client.models.list();
      
      return response.data
        .filter(m => m.id.includes('gpt'))
        .map(model => this.mapOpenAIModel(model));
    } catch (error) {
      this.logger.warn(`OpenAI models fetch failed: ${error.message}`);
      return this.getStaticOpenAIModels();
    }
  }

  private mapOpenAIModel(model: any): ModelInfo {
    const modelMap: Record<string, Partial<ModelInfo>> = {
      'gpt-4o': {
        contextLength: 128000,
        description: 'Latest GPT-4 Omni model with vision and advanced reasoning',
        purpose: ['chat', 'reasoning', 'vision', 'code', 'complex-tasks'],
        performance: { speed: 'medium', quality: 'high' },
        pricing: { input: 2.5, output: 10, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
          functionCalling: true,
          vision: true,
        },
      },
      'gpt-4-turbo': {
        contextLength: 128000,
        description: 'Fast GPT-4 variant with vision capabilities',
        purpose: ['chat', 'reasoning', 'vision', 'code'],
        performance: { speed: 'fast', quality: 'high' },
        pricing: { input: 10, output: 30, currency: 'USD' },
      },
      'gpt-3.5-turbo': {
        contextLength: 16385,
        description: 'Fast and efficient model for most tasks',
        purpose: ['chat', 'general', 'code'],
        performance: { speed: 'fast', quality: 'medium' },
        pricing: { input: 0.5, output: 1.5, currency: 'USD' },
      },
    };

    const defaults = modelMap[model.id] || {
      contextLength: 8192,
      description: 'OpenAI model',
      purpose: ['chat'],
      performance: { speed: 'medium', quality: 'medium' },
      pricing: { input: 1, output: 2, currency: 'USD' },
    };

    return {
      id: model.id,
      name: model.id,
      provider: 'openai',
      type: 'cloud',
      cost: 'paid',
      contextLength: defaults.contextLength,
      description: defaults.description,
      purpose: defaults.purpose,
      performance: defaults.performance,
      pricing: defaults.pricing,
      capabilities: {
        chat: true,
        completion: true,
        streaming: true,
        functionCalling: true,
      },
      limits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000,
      },
    };
  }

  private getStaticOpenAIModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4 Omni',
        provider: 'openai',
        type: 'cloud',
        cost: 'paid',
        pricing: { input: 2.5, output: 10, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
          functionCalling: true,
          vision: true,
        },
        contextLength: 128000,
        description: 'Latest GPT-4 Omni model with vision and advanced reasoning',
        purpose: ['chat', 'reasoning', 'vision', 'code', 'complex-tasks'],
        performance: { speed: 'medium', quality: 'high' },
        limits: { requestsPerMinute: 500, tokensPerMinute: 150000 },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        type: 'cloud',
        cost: 'paid',
        pricing: { input: 0.5, output: 1.5, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: true,
          functionCalling: true,
        },
        contextLength: 16385,
        description: 'Fast and efficient model for most tasks',
        purpose: ['chat', 'general', 'code'],
        performance: { speed: 'fast', quality: 'medium' },
        limits: { requestsPerMinute: 500, tokensPerMinute: 150000 },
      },
    ];
  }

  private async fetchHuggingFaceModels(): Promise<ModelInfo[]> {
    const apiKey = this.config.get('HUGGINGFACE_API_KEY');
    if (!apiKey) return [];

    // HuggingFace Inference API doesn't provide a model list endpoint
    // Return curated list of popular free models
    return this.getStaticHuggingFaceModels();
  }

  private getStaticHuggingFaceModels(): ModelInfo[] {
    return [
      {
        id: 'meta-llama/Meta-Llama-3-8B-Instruct',
        name: 'Llama 3 8B Instruct',
        provider: 'huggingface',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0, output: 0, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: false,
        },
        contextLength: 8192,
        description: 'Meta Llama 3 instruction-tuned model via HuggingFace Inference API',
        purpose: ['chat', 'general', 'instruction-following'],
        performance: { speed: 'medium', quality: 'medium' },
        limits: { requestsPerMinute: 100, dailyLimit: 1000 },
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.2',
        name: 'Mistral 7B Instruct',
        provider: 'huggingface',
        type: 'cloud',
        cost: 'free',
        pricing: { input: 0, output: 0, currency: 'USD' },
        capabilities: {
          chat: true,
          completion: true,
          streaming: false,
        },
        contextLength: 8192,
        description: 'Mistral instruction-tuned model',
        purpose: ['chat', 'code', 'general'],
        performance: { speed: 'medium', quality: 'high' },
        limits: { requestsPerMinute: 100, dailyLimit: 1000 },
      },
    ];
  }
}
