import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../../search/services/search.service';
import { LlmService } from '../../llm/services/llm.service';
import { SearchDto } from '../../search/dto/search.dto';

/**
 * RAG query options
 */
export interface RagQueryOptions {
  /** Maximum number of context items to retrieve */
  maxContextItems?: number;
  
  /** Search type to use */
  searchType?: 'hybrid' | 'semantic' | 'keyword';
  
  /** Temperature for LLM response generation */
  temperature?: number;
  
  /** Maximum tokens for response */
  maxTokens?: number;
  
  /** User ID for personalization */
  userId?: string;
  
  /** Include item details in response */
  includeDetails?: boolean;
  
  /** Language hint */
  language?: 'en' | 'hi' | 'mr' | 'auto';
}

/**
 * Source reference from retrieved context
 */
export interface RagSource {
  id: string;
  name: string;
  type: 'restaurant' | 'item' | 'category';
  relevanceScore: number;
  snippet?: string;
  price?: number;
  rating?: number;
  imageUrl?: string;
}

/**
 * RAG response
 */
export interface RagResponse {
  /** Generated natural language answer */
  answer: string;
  
  /** Sources used to generate the answer */
  sources: RagSource[];
  
  /** Whether the answer was generated with context */
  hasContext: boolean;
  
  /** Processing metrics */
  metrics: {
    retrievalTimeMs: number;
    generationTimeMs: number;
    totalTimeMs: number;
    tokensUsed: number;
    provider: string;
  };
  
  /** Suggested follow-up questions */
  suggestions?: string[];
}

/**
 * RAGService - Retrieval-Augmented Generation for Conversational Search
 * 
 * This service combines:
 * 1. SearchService for retrieving relevant products/restaurants
 * 2. LlmService (vLLM/Cloud) for generating natural language responses
 * 
 * It enables conversational search queries like:
 * - "What pizza options do you have under ₹200?"
 * - "I want something spicy from a highly rated restaurant"
 * - "Best biryani near me with quick delivery"
 * 
 * Architecture:
 * 1. Parse user query to understand intent
 * 2. Search for relevant context (products, restaurants)
 * 3. Build a prompt with retrieved context
 * 4. Generate natural language response with LLM
 * 5. Extract actionable items (order buttons, etc.)
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  
  constructor(
    private readonly searchService: SearchService,
    private readonly llmService: LlmService,
  ) {
    this.logger.log('✅ RAGService initialized');
    this.logger.log('   Search: OpenSearch hybrid search');
    this.logger.log('   LLM: vLLM (local) with cloud fallback');
  }
  
  /**
   * Answer a user query using retrieved context
   */
  async query(userQuery: string, options: RagQueryOptions = {}): Promise<RagResponse> {
    const startTime = Date.now();
    const {
      maxContextItems = 5,
      searchType = 'hybrid',
      temperature = 0.3,
      maxTokens = 500,
      includeDetails = true,
      language = 'auto',
    } = options;
    
    this.logger.log(`RAG query: "${userQuery.substring(0, 50)}..."`);
    
    // Step 1: Retrieve relevant context
    const retrievalStart = Date.now();
    const context = await this.retrieveContext(userQuery, {
      maxResults: maxContextItems,
      searchType,
    });
    const retrievalTimeMs = Date.now() - retrievalStart;
    
    // Step 2: Build prompt with context
    const prompt = this.buildPrompt(userQuery, context, { language });
    
    // Step 3: Generate response with LLM
    const generationStart = Date.now();
    const llmResponse = await this.generateResponse(prompt, {
      temperature,
      maxTokens,
    });
    const generationTimeMs = Date.now() - generationStart;
    
    // Step 4: Parse response and build sources
    const sources = context.map((item, index) => this.itemToSource(item, index));
    
    // Step 5: Generate suggestions if answer is informative
    const suggestions = this.generateSuggestions(userQuery, context);
    
    const totalTimeMs = Date.now() - startTime;
    
    this.logger.log(`RAG completed in ${totalTimeMs}ms (retrieval: ${retrievalTimeMs}ms, generation: ${generationTimeMs}ms)`);
    
    return {
      answer: llmResponse.content,
      sources,
      hasContext: context.length > 0,
      metrics: {
        retrievalTimeMs,
        generationTimeMs,
        totalTimeMs,
        tokensUsed: llmResponse.usage?.totalTokens || 0,
        provider: llmResponse.provider,
      },
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }
  
  /**
   * Retrieve relevant context from search
   */
  private async retrieveContext(
    query: string,
    options: { maxResults: number; searchType: string },
  ): Promise<any[]> {
    try {
      // Search for products/items first
      const searchDto: SearchDto = {
        query,
        index: 'all',
        limit: options.maxResults,
        offset: 0,
        searchType: options.searchType as any,
      };
      
      const result = await this.searchService.search(searchDto);
      
      return result.results || [];
    } catch (error) {
      this.logger.warn(`Context retrieval failed: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Build the prompt for LLM with retrieved context
   */
  private buildPrompt(
    query: string,
    context: any[],
    options: { language: string },
  ): string {
    // Format context items
    const contextText = context.length > 0
      ? context.map((item, i) => this.formatContextItem(item, i + 1)).join('\n\n')
      : 'No specific items found matching the query.';
    
    // Determine response language
    const isHindi = this.detectHindi(query);
    const languageInstruction = isHindi
      ? 'Respond in Hindi (Devanagari script) or Hinglish as appropriate.'
      : 'Respond in English.';
    
    return `You are a helpful food ordering assistant for Mangwale, a food delivery platform.

CONTEXT (Available items and restaurants):
${contextText}

IMPORTANT RULES:
1. Answer based ONLY on the context above. Do not make up items or prices.
2. If the user asks for something not in the context, say so honestly and suggest alternatives.
3. Be concise and helpful. Format responses clearly.
4. ${languageInstruction}
5. Include prices (₹) when mentioning items.
6. If recommending, explain WHY briefly (e.g., "highly rated", "quick delivery").
7. End with a clear call-to-action (e.g., "Would you like to order any of these?")

USER QUERY: ${query}

RESPONSE:`;
  }
  
  /**
   * Format a single context item for the prompt
   */
  private formatContextItem(item: any, index: number): string {
    const source = item.source || item;
    const type = item.index?.includes('store') ? 'Restaurant' : 'Item';
    
    const parts = [
      `[${index}] ${type}: ${source.name}`,
    ];
    
    if (source.description) {
      parts.push(`   Description: ${source.description.substring(0, 100)}`);
    }
    
    if (source.price) {
      parts.push(`   Price: ₹${source.price}`);
    }
    
    if (source.rating) {
      parts.push(`   Rating: ${source.rating}⭐`);
    }
    
    if (source.delivery_time) {
      parts.push(`   Delivery: ~${source.delivery_time} mins`);
    }
    
    if (source.store_name) {
      parts.push(`   From: ${source.store_name}`);
    }
    
    if (source.cuisine) {
      parts.push(`   Cuisine: ${source.cuisine}`);
    }
    
    return parts.join('\n');
  }
  
  /**
   * Generate response using LLM
   */
  private async generateResponse(
    prompt: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<{ content: string; usage?: any; provider: string }> {
    try {
      const response = await this.llmService.chat({
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
      
      return {
        content: response.content,
        usage: response.usage,
        provider: response.provider,
      };
    } catch (error) {
      this.logger.error(`LLM generation failed: ${error.message}`);
      
      // Fallback response
      return {
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again or browse our menu directly.',
        provider: 'fallback',
      };
    }
  }
  
  /**
   * Convert search item to source reference
   */
  private itemToSource(item: any, index: number): RagSource {
    const source = item.source || item;
    
    return {
      id: item.id || String(index),
      name: source.name,
      type: item.index?.includes('store') ? 'restaurant' : 'item',
      relevanceScore: item.score || (1 - index * 0.1),
      snippet: source.description?.substring(0, 100),
      price: source.price,
      rating: source.rating,
      imageUrl: source.image || source.logo,
    };
  }
  
  /**
   * Generate follow-up suggestions based on query and context
   */
  private generateSuggestions(query: string, context: any[]): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();
    
    // If asking about items, suggest restaurant info
    if (context.some(c => c.index?.includes('item'))) {
      suggestions.push('Would you like to know more about the restaurant?');
    }
    
    // If no budget mentioned, suggest budget options
    if (!queryLower.includes('under') && !queryLower.includes('budget') && !queryLower.includes('cheap')) {
      suggestions.push('Want me to find options under ₹200?');
    }
    
    // If no rating mentioned, suggest highly rated
    if (!queryLower.includes('rated') && !queryLower.includes('best') && !queryLower.includes('popular')) {
      suggestions.push('Should I show only highly rated options?');
    }
    
    // Suggest quick delivery
    if (!queryLower.includes('quick') && !queryLower.includes('fast') && !queryLower.includes('delivery')) {
      suggestions.push('Need quick delivery?');
    }
    
    return suggestions.slice(0, 2);
  }
  
  /**
   * Detect if query is in Hindi/Devanagari
   */
  private detectHindi(text: string): boolean {
    // Check for Devanagari characters
    return /[\u0900-\u097F]/.test(text);
  }
  
  /**
   * Answer a simple yes/no or factual question
   */
  async answerSimple(
    question: string,
    context: string[],
    options: { language?: 'en' | 'hi' } = {},
  ): Promise<string> {
    const contextText = context.join('\n');
    
    const prompt = `Based on this information:
${contextText}

Answer this question concisely: ${question}

If the answer is not in the information, say "I don't have that information."`;

    const response = await this.llmService.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 150,
    });
    
    return response.content;
  }
  
  /**
   * Compare items or restaurants
   */
  async compare(items: any[], criteria: string[]): Promise<string> {
    if (items.length < 2) {
      return 'Need at least 2 items to compare.';
    }
    
    const itemsText = items.map((item, i) => 
      `Item ${i + 1}: ${item.name}, Price: ₹${item.price || 'N/A'}, Rating: ${item.rating || 'N/A'}`
    ).join('\n');
    
    const criteriaText = criteria.join(', ') || 'price, rating, and overall value';
    
    const prompt = `Compare these items based on ${criteriaText}:

${itemsText}

Provide a brief, helpful comparison and recommendation.`;

    const response = await this.llmService.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 300,
    });
    
    return response.content;
  }
}
