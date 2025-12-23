import { Controller, Post, Body, Get, Query, Param, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { LlmService } from '../services/llm.service';
import { PromptTemplateService } from '../services/prompt-template.service';
import { ModelRegistryService } from '../services/model-registry.service';
import { LlmUsageTrackingService } from '../services/llm-usage-tracking.service';
import { RagService, RagQueryOptions, RagResponse } from '../services/rag.service';
import { ChatCompletionDto } from '../dto/chat-completion.dto';
import { ChatCompletionResultDto } from '../dto/chat-completion-result.dto';

@Controller('llm')
export class LlmController {
  private readonly logger = new Logger(LlmController.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly modelRegistry: ModelRegistryService,
    private readonly usageTracking: LlmUsageTrackingService,
    private readonly ragService: RagService,
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatCompletionDto): Promise<ChatCompletionResultDto> {
    this.logger.log(
      `LLM chat request: ${dto.messages.length} messages (provider: ${dto.provider})`,
    );
    return this.llmService.chat(dto);
  }

  @Post('chat/stream')
  async chatStream(
    @Body() dto: ChatCompletionDto,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(
      `LLM streaming chat request: ${dto.messages.length} messages (provider: ${dto.provider})`,
    );

    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      const stream = await this.llmService.chatStream(dto);

      // Forward the stream chunks
      stream.on('data', (chunk: Buffer) => {
        response.write(chunk);
      });

      stream.on('end', () => {
        response.end();
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`Streaming error: ${error.message}`, error.stack);
        response.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        response.end();
      });
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`, error.stack);
      response.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // RAG (Retrieval-Augmented Generation) Endpoints
  // ============================================

  /**
   * Conversational search with RAG
   * Retrieves relevant products/restaurants and generates a natural language answer
   * 
   * Example queries:
   * - "What pizza options do you have under ₹200?"
   * - "I want something spicy from a highly rated restaurant"
   * - "Best biryani near me with quick delivery"
   * - "मुझे जल्दी से कुछ खाना चाहिए" (Hindi: I need food quickly)
   */
  @Post('rag/query')
  async ragQuery(
    @Body() body: { 
      query: string; 
      maxContextItems?: number;
      searchType?: 'hybrid' | 'semantic' | 'keyword';
      temperature?: number;
      maxTokens?: number;
      userId?: string;
      includeDetails?: boolean;
      language?: 'en' | 'hi' | 'mr' | 'auto';
    },
  ): Promise<RagResponse> {
    this.logger.log(`RAG query: "${body.query.substring(0, 50)}..."`);
    
    const options: RagQueryOptions = {
      maxContextItems: body.maxContextItems,
      searchType: body.searchType,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      userId: body.userId,
      includeDetails: body.includeDetails,
      language: body.language,
    };
    
    return this.ragService.query(body.query, options);
  }

  /**
   * Simple factual Q&A with provided context
   */
  @Post('rag/answer')
  async ragAnswer(
    @Body() body: {
      question: string;
      context: string[];
      language?: 'en' | 'hi';
    },
  ): Promise<{ answer: string }> {
    this.logger.log(`RAG simple answer: "${body.question.substring(0, 50)}..."`);
    
    const answer = await this.ragService.answerSimple(
      body.question,
      body.context,
      { language: body.language },
    );
    
    return { answer };
  }

  /**
   * Compare items or restaurants
   */
  @Post('rag/compare')
  async ragCompare(
    @Body() body: {
      items: Array<{ name: string; price?: number; rating?: number; [key: string]: any }>;
      criteria?: string[];
    },
  ): Promise<{ comparison: string }> {
    this.logger.log(`RAG compare: ${body.items.length} items`);
    
    const comparison = await this.ragService.compare(
      body.items,
      body.criteria || ['price', 'rating', 'value'],
    );
    
    return { comparison };
  }

  @Get('models')
  async getModels(
    @Query('provider') provider?: string,
    @Query('cost') cost?: 'free' | 'paid',
    @Query('purpose') purpose?: string,
    @Query('refresh') refresh?: string,
  ): Promise<{ models: any[]; count: number }> {
    const forceRefresh = refresh === 'true';
    
    let models = await this.modelRegistry.getAllModels(forceRefresh);

    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (cost) {
      models = models.filter(m => m.cost === cost);
    }

    if (purpose) {
      models = models.filter(m => m.purpose.includes(purpose));
    }

    return {
      models,
      count: models.length,
    };
  }

  @Get('models/:modelId')
  async getModelInfo(@Param('modelId') modelId: string): Promise<any> {
    const model = await this.modelRegistry.getModelInfo(decodeURIComponent(modelId));
    
    if (!model) {
      return { error: 'Model not found' };
    }

    return model;
  }

  @Get('providers')
  async getProviders(): Promise<{ providers: any[] }> {
    const models = await this.modelRegistry.getAllModels();
    const providerMap = new Map();

    models.forEach(model => {
      if (!providerMap.has(model.provider)) {
        providerMap.set(model.provider, {
          name: model.provider,
          modelCount: 0,
          freeModels: 0,
          paidModels: 0,
          freeModelsWithIndianLanguages: 0,
          capabilities: new Set(),
        });
      }

      const provider = providerMap.get(model.provider);
      provider.modelCount++;
      
      if (model.cost === 'free') {
        provider.freeModels++;
        
        // Check for Indian language support
        const indianLanguages = ['hindi', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'kannada', 'malayalam', 'punjabi', 'urdu', 'odia', 'assamese'];
        if (model.languages && model.languages.some(lang => indianLanguages.includes(lang.toLowerCase()))) {
          provider.freeModelsWithIndianLanguages++;
        }
      } else {
        provider.paidModels++;
      }

      Object.keys(model.capabilities).forEach(cap => {
        if (model.capabilities[cap]) provider.capabilities.add(cap);
      });
    });

    return {
      providers: Array.from(providerMap.values()).map(p => ({
        ...p,
        capabilities: Array.from(p.capabilities),
      })),
    };
  }

  @Get('models/free/all')
  async getFreeModels(): Promise<{ models: any[]; count: number }> {
    const models = await this.modelRegistry.getFreeModels();
    return {
      models,
      count: models.length,
    };
  }

  @Get('models/purpose/:purpose')
  async getModelsByPurpose(@Param('purpose') purpose: string): Promise<{ models: any[]; count: number }> {
    const models = await this.modelRegistry.getModelsByPurpose(purpose);
    return {
      models,
      count: models.length,
    };
  }

  @Get('models/free/indian-languages')
  async getFreeModelsWithIndianLanguages(): Promise<{ models: any[]; count: number; languages: string[] }> {
    const models = await this.modelRegistry.getFreeModelsWithIndianLanguages();
    
    // Extract unique Indian languages from all models
    const languagesSet = new Set<string>();
    models.forEach(model => {
      if (model.languages) {
        model.languages.forEach(lang => languagesSet.add(lang));
      }
    });

    return {
      models,
      count: models.length,
      languages: Array.from(languagesSet).sort(),
    };
  }

  @Get('templates')
  async getTemplates(): Promise<{ templates: string[] }> {
    return {
      templates: [
        'parcel_assistant',
        'order_tracker',
        'product_search',
        'complaint_handler',
      ],
    };
  }

  @Post('estimate-cost')
  async estimateCost(
    @Body() body: { tokens: number; model: string },
  ): Promise<{ estimatedCost: number; breakdown?: any }> {
    const modelInfo = await this.modelRegistry.getModelInfo(body.model);
    
    if (!modelInfo || !modelInfo.pricing) {
      return { estimatedCost: 0 };
    }

    const inputTokens = body.tokens / 2;
    const outputTokens = body.tokens / 2;

    const cost = (
      (inputTokens / 1_000_000) * modelInfo.pricing.input +
      (outputTokens / 1_000_000) * modelInfo.pricing.output
    );

    return {
      estimatedCost: cost,
      breakdown: {
        inputCost: (inputTokens / 1_000_000) * modelInfo.pricing.input,
        outputCost: (outputTokens / 1_000_000) * modelInfo.pricing.output,
        currency: modelInfo.pricing.currency,
        model: modelInfo.name,
      },
    };
  }

  @Get('health')
  async health(): Promise<{ status: string; providers: string[] }> {
    const models = await this.llmService.getAvailableModels();
    const providers = [...new Set(models.map((m) => m.provider))];

    return {
      status: providers.length > 0 ? 'ok' : 'degraded',
      providers,
    };
  }

  // Analytics Endpoints

  @Get('analytics/usage')
  async getUsageAnalytics(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (userId) {
      return this.usageTracking.getUserUsage(userId, start, end);
    }

    // Return overall analytics for admin view
    const [performance, popularModels, costAnalytics] = await Promise.all([
      this.usageTracking.getPerformanceMetrics(start, end),
      this.usageTracking.getPopularModels(10, start, end),
      this.usageTracking.getCostAnalytics('day', start, end),
    ]);

    return {
      performance,
      popularModels,
      costTrends: costAnalytics,
    };
  }

  @Get('analytics/costs')
  async getCostAnalytics(
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.usageTracking.getCostAnalytics(groupBy, start, end);
  }

  @Get('analytics/popular-models')
  async getPopularModels(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const modelLimit = limit ? parseInt(limit, 10) : 10;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.usageTracking.getPopularModels(modelLimit, start, end);
  }

  @Get('analytics/performance')
  async getPerformanceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.usageTracking.getPerformanceMetrics(start, end);
  }

  @Get('analytics/model/:modelId')
  async getModelAnalytics(
    @Param('modelId') modelId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.usageTracking.getModelUsageStats(
      decodeURIComponent(modelId),
      start,
      end,
    );
  }

  @Get('analytics/provider/:provider')
  async getProviderAnalytics(
    @Param('provider') provider: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.usageTracking.getProviderUsageStats(provider, start, end);
  }
}
