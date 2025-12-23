import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * 🎯 RAG Context Builder
 * 
 * Retrieves relevant product information from OpenSearch
 * and formats it as context for LLM prompts (RAG - Retrieval Augmented Generation)
 * 
 * Use cases:
 * - Food recommendations with descriptions
 * - Product comparison queries
 * - Answering "tell me more about X"
 * - Personalized suggestions with reasons
 */

export interface RagContextOptions {
  query: string;
  module: 'food' | 'ecom';
  maxItems?: number;
  includeDescriptions?: boolean;
  includeIngredients?: boolean;
  includePrices?: boolean;
  includeRatings?: boolean;
  includeNutrition?: boolean;
  lat?: string;
  lng?: string;
}

export interface RagContextResult {
  context: string;
  itemCount: number;
  sources: Array<{
    id: number;
    name: string;
    store?: string;
  }>;
}

@Injectable()
export class RagContextService {
  private readonly logger = new Logger(RagContextService.name);
  private readonly searchApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.searchApiUrl = this.configService.get('SEARCH_API_URL', 'http://search-api:3100');
    this.logger.log('✅ RagContextService initialized');
  }

  /**
   * Build RAG context from search results
   */
  async buildContext(options: RagContextOptions): Promise<RagContextResult> {
    const { 
      query, 
      module, 
      maxItems = 5,
      includeDescriptions = true,
      includeIngredients = false,
      includePrices = true,
      includeRatings = true,
      includeNutrition = false,
      lat,
      lng,
    } = options;

    try {
      // Search for relevant items
      const searchParams: Record<string, any> = {
        q: query,
        size: maxItems,
      };

      if (lat && lng) {
        searchParams.lat = lat;
        searchParams.lng = lng;
      }

      const endpoint = module === 'food'
        ? `${this.searchApiUrl}/search/semantic/food`
        : `${this.searchApiUrl}/v2/search/items`;

      const response = await firstValueFrom(
        this.httpService.get(endpoint, {
          params: searchParams,
          timeout: 10000,
        }),
      );

      let items = response.data;
      if (Array.isArray(items)) {
        // Already an array
      } else if (items.items) {
        items = items.items;
      } else if (items.results) {
        items = items.results;
      }

      if (!items || items.length === 0) {
        return {
          context: `No products found for "${query}".`,
          itemCount: 0,
          sources: [],
        };
      }

      // Build context string
      const contextParts: string[] = [];
      const sources: Array<{ id: number; name: string; store?: string }> = [];

      contextParts.push(`📦 PRODUCT INFORMATION FOR "${query.toUpperCase()}":`);
      contextParts.push('');

      items.slice(0, maxItems).forEach((item: any, index: number) => {
        const name = item.name || item.title;
        const price = item.price || item.mrp;
        const description = item.description;
        const storeName = item.store_name;
        const category = item.category || item.category_name;
        const rating = item.avg_rating || item.rating;
        const veg = item.veg;
        const deliveryTime = item.delivery_time;

        // Track source
        sources.push({
          id: item.id,
          name,
          store: storeName,
        });

        // Build item context
        const itemParts: string[] = [];
        
        itemParts.push(`${index + 1}. **${name}**`);
        
        if (veg !== undefined) {
          itemParts[0] += veg === 1 ? ' 🥬 (Veg)' : ' 🍖 (Non-Veg)';
        }

        if (storeName) {
          itemParts.push(`   📍 From: ${storeName}`);
        }

        if (category) {
          itemParts.push(`   🏷️ Category: ${category}`);
        }

        if (includePrices && price) {
          itemParts.push(`   💰 Price: ₹${price}`);
        }

        if (includeRatings && rating) {
          const stars = '⭐'.repeat(Math.round(rating));
          itemParts.push(`   ${stars} Rating: ${rating}/5`);
        }

        if (deliveryTime) {
          itemParts.push(`   🕐 Delivery: ${deliveryTime}`);
        }

        if (includeDescriptions && description) {
          // Truncate long descriptions
          const shortDesc = description.length > 200 
            ? description.substring(0, 200) + '...' 
            : description;
          itemParts.push(`   📝 ${shortDesc}`);
        }

        if (includeIngredients && item.ingredients) {
          itemParts.push(`   🧪 Ingredients: ${item.ingredients}`);
        }

        if (includeNutrition && item.nutrition) {
          itemParts.push(`   🥗 Nutrition: ${item.nutrition}`);
        }

        contextParts.push(itemParts.join('\n'));
        contextParts.push(''); // Empty line between items
      });

      // Add summary
      contextParts.push(`---`);
      contextParts.push(`Found ${items.length} matching items. Use this information to help the user.`);

      return {
        context: contextParts.join('\n'),
        itemCount: items.length,
        sources,
      };
    } catch (error) {
      this.logger.error(`RAG context build failed: ${error.message}`);
      return {
        context: `Unable to retrieve product information for "${query}".`,
        itemCount: 0,
        sources: [],
      };
    }
  }

  /**
   * Build compact context for quick queries (less tokens)
   */
  async buildCompactContext(query: string, module: 'food' | 'ecom', maxItems: number = 3): Promise<string> {
    const result = await this.buildContext({
      query,
      module,
      maxItems,
      includeDescriptions: false,
      includeIngredients: false,
      includePrices: true,
      includeRatings: false,
      includeNutrition: false,
    });

    return result.context;
  }

  /**
   * Build context for product comparison
   */
  async buildComparisonContext(productIds: number[], module: 'food' | 'ecom'): Promise<string> {
    // TODO: Fetch specific products by ID and format for comparison
    return `Product comparison context for IDs: ${productIds.join(', ')}`;
  }

  /**
   * Build context from already-fetched items (avoids duplicate API call)
   */
  buildContextFromItems(items: any[], query: string): RagContextResult {
    if (!items || items.length === 0) {
      return {
        context: `No products found for "${query}".`,
        itemCount: 0,
        sources: [],
      };
    }

    const contextParts: string[] = [];
    const sources: Array<{ id: number; name: string; store?: string }> = [];

    contextParts.push(`📦 AVAILABLE OPTIONS FOR "${query.toUpperCase()}":`);
    contextParts.push('');

    items.slice(0, 5).forEach((item: any, index: number) => {
      const name = item.name || item.title;
      const price = item.price || item.mrp;
      const storeName = item.store_name || item.storeName;
      const veg = item.veg;

      sources.push({ id: item.id, name, store: storeName });

      const vegIcon = veg === 1 ? '🥬' : (veg === 0 ? '🍖' : '');
      const priceStr = price ? ` - ₹${price}` : '';
      const storeStr = storeName ? ` from ${storeName}` : '';

      contextParts.push(`${index + 1}. ${vegIcon} ${name}${priceStr}${storeStr}`);
    });

    return {
      context: contextParts.join('\n'),
      itemCount: items.length,
      sources,
    };
  }

  /**
   * Get context for "tell me more" queries
   */
  async getDetailedProductContext(itemId: number, module: 'food' | 'ecom'): Promise<string> {
    // TODO: Implement detailed product fetch by ID
    return `Detailed information for product ${itemId}`;
  }
}
