import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OpenSearchService } from './opensearch.service';
import { UnifiedEmbeddingService } from './unified-embedding.service';
import { ModuleService } from './module.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { SearchDto } from '../dto/search.dto';
import { SearchResultDto, SearchHit } from '../dto/search-result.dto';
import { PhpStoreService } from '../../php-integration/services/php-store.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly searchApiUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly openSearchService: OpenSearchService,
    private readonly unifiedEmbeddingService: UnifiedEmbeddingService,
    private readonly moduleService: ModuleService,
    private readonly phpStoreService: PhpStoreService,
    private readonly analyticsService: SearchAnalyticsService,
  ) {
    this.searchApiUrl = this.config.get('SEARCH_API_URL', 'http://localhost:3100');
    this.logger.log('✅ SearchService initialized with language-aware embeddings');
  }

  /**
   * Universal search - keyword, semantic, or hybrid
   */
  async search(dto: SearchDto): Promise<SearchResultDto> {
    const startTime = Date.now();
    let result: SearchResultDto;

    try {
      switch (dto.searchType) {
        case 'keyword':
          result = await this.keywordSearch(dto);
          break;
        
        case 'semantic':
          result = await this.semanticSearch(dto);
          break;
        
        case 'hybrid':
        default:
          result = await this.hybridSearch(dto);
          break;
      }
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      
      // Fallback to PHP API
      this.logger.warn(`⚠️ Falling back to PHP API for search: "${dto.query}"`);
      try {
        const phpResults = await this.phpStoreService.searchItems(dto.query);
        
        // Map PHP results to SearchResultDto format
        const results: SearchHit[] = (phpResults.data || []).map((item: any) => ({
          id: String(item.id),
          index: 'items', // Virtual index
          score: 1.0,
          source: {
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            store_id: item.store_id,
            module_id: item.module_id
          }
        }));

        result = {
          results,
          total: results.length,
          took: Date.now() - startTime,
          searchType: 'fallback',
          query: dto.query,
        };
      } catch (fallbackError) {
        this.logger.error(`PHP Fallback failed: ${fallbackError.message}`);
        result = {
          results: [],
          total: 0,
          took: Date.now() - startTime,
          searchType: dto.searchType as any,
          query: dto.query,
        };
      }
    }

    // Log search for analytics
    this.analyticsService.logSearch({
      query: dto.query,
      searchType: result.searchType,
      filters: dto.filters,
      resultsCount: result.total,
      executionTimeMs: result.took,
    });

    return result;
  }

  /**
   * Unified search across modules - proxies to Search API
   */
  async unifiedSearch(q: string, filters: Record<string, string>): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.searchApiUrl}/search`, {
          params: { q, ...filters },
        }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Unified search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Module-specific search - proxies to Search API with fallback to OpenSearch
   */
  async moduleSearch(module: string, q: string, filters: Record<string, string>): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.searchApiUrl}/search/${module}`, {
          params: { q, ...filters },
          timeout: 3000, // 3 second timeout
        }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.warn(`${module} search API failed: ${error.message}, falling back to OpenSearch`);
      
      // Fallback to direct OpenSearch
      try {
        const index = module === 'food' ? 'food_items' : module === 'ecom' ? 'ecom_items' : 'food_items';
        const result = await this.openSearchService.keywordSearch(q, index, 10, 0, []);
        
        // S3 base URL for images (CDN has SSL issues)
        const S3_BASE = 'https://s3.ap-south-1.amazonaws.com/mangwale/product';
        
        // Map to expected response format
        return {
          items: result.results.map(hit => {
            // Handle image - prefer full URL, fallback to filename with S3
            let imageUrl = hit.source?.image_full_url || hit.source?.image;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `${S3_BASE}/${imageUrl}`;
            } else if (imageUrl && imageUrl.includes('storage.mangwale.ai')) {
              // Replace problematic CDN with S3
              imageUrl = imageUrl.replace('https://storage.mangwale.ai/mangwale/product', S3_BASE);
            }
            
            return {
              id: hit.id,
              name: hit.source?.name || hit.source?.title,
              description: hit.source?.description,
              price: hit.source?.price || hit.source?.mrp,
              image: imageUrl,
              rating: hit.source?.rating || 0,
              deliveryTime: hit.source?.delivery_time || '30-45 min',
              category: hit.source?.category,
              storeName: hit.source?.store_name,
              storeId: hit.source?.store_id,
              veg: hit.source?.veg,
            };
          }),
          total: result.total,
        };
      } catch (fallbackError) {
        this.logger.error(`OpenSearch fallback also failed: ${fallbackError.message}`);
        throw error;
      }
    }
  }

  /**
   * Module stores search - proxies to Search API
   */
  async moduleStoresSearch(module: string, q: string, filters: Record<string, string>): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.searchApiUrl}/search/${module}/stores`, {
          params: { q, ...filters },
        }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`${module} stores search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Module suggestions - proxies to Search API
   */
  async moduleSuggest(module: string, q: string, filters: Record<string, string>): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.searchApiUrl}/search/${module}/suggest`, {
          params: { q, ...filters },
        }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`${module} suggest failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular categories using aggregation
   */
  async getPopularCategories(index: string = 'food_items_v4', limit: number = 8): Promise<string[]> {
    try {
      const body = {
        size: 0, // We don't need hits, just aggregations
        aggs: {
          popular_categories: {
            terms: {
              field: 'category.keyword', // Ensure we use the keyword field for exact matching
              size: limit,
            },
          },
        },
      };

      const result = await this.openSearchService.rawSearch(index, body);
      
      if (result.aggregations && result.aggregations.popular_categories) {
        return result.aggregations.popular_categories.buckets.map((b: any) => b.key);
      }
      
      return [];
    } catch (error) {
      this.logger.warn(`Failed to get popular categories: ${error.message}`);
      return []; // Return empty array on failure, caller should handle fallback
    }
  }

  private async keywordSearch(dto: SearchDto): Promise<SearchResultDto> {
    return this.openSearchService.keywordSearch(
      dto.query,
      dto.index,
      dto.limit,
      dto.offset,
      dto.filters,
    );
  }

  private async semanticSearch(dto: SearchDto): Promise<SearchResultDto> {
    // Determine if we should use the food embedding model
    // food_items_v3 index requires 768-dim food embeddings (jonny9f/food_embeddings model)
    const isFoodIndex = dto.index?.includes('food_items');
    
    let embeddingResult;
    if (isFoodIndex) {
      // Use dedicated food embedding model (768-dim) for food searches
      embeddingResult = await this.unifiedEmbeddingService.embedFood(dto.query);
      this.logger.debug(
        `Food semantic search: query="${dto.query.substring(0, 30)}..." ` +
        `model=${embeddingResult.model} dim=${embeddingResult.dimensions}`
      );
    } else {
      // Use language-aware embeddings for other searches
      // Automatically uses IndicBERT for Hindi/Marathi, MiniLM for English
      embeddingResult = await this.unifiedEmbeddingService.embed(dto.query);
      this.logger.debug(
        `Semantic search: query="${dto.query.substring(0, 30)}..." ` +
        `model=${embeddingResult.model} lang=${embeddingResult.language} dim=${embeddingResult.dimensions}`
      );
    }

    // Use native embedding dimensions - OpenSearchService will pick the right field
    // food_items_v3: item_vector (768-dim)
    // embedding_384 for MiniLM (English), embedding_768 for IndicBERT (Hindi)
    return this.openSearchService.vectorSearch(
      embeddingResult.embedding,
      dto.index,
      dto.limit,
      dto.offset,
      dto.filters,
    );
  }

  private async hybridSearch(dto: SearchDto): Promise<SearchResultDto> {
    // Run both searches in parallel, handling failures
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch(dto).catch(err => {
        this.logger.warn(`Keyword search failed in hybrid search: ${err.message}`);
        return null;
      }),
      this.semanticSearch(dto).catch(err => {
        this.logger.warn(`Semantic search failed in hybrid search: ${err.message}`);
        return null;
      }),
    ]);

    if (!keywordResults && !semanticResults) {
       throw new Error('Both keyword and semantic search failed');
    }

    if (!keywordResults) return semanticResults!;
    if (!semanticResults) return keywordResults!;

    // Combine and deduplicate results
    const combined = this.combineResults(keywordResults, semanticResults);

    return combined;
  }

  private combineResults(
    keywordResults: SearchResultDto,
    semanticResults: SearchResultDto,
  ): SearchResultDto {
    const resultMap = new Map<string, SearchHit>();

    // Add keyword results with weight
    for (const hit of keywordResults.results) {
      resultMap.set(hit.id, {
        ...hit,
        score: hit.score * 0.6, // 60% weight for keyword
      });
    }

    // Add semantic results with weight
    for (const hit of semanticResults.results) {
      const existing = resultMap.get(hit.id);
      if (existing) {
        // Combine scores
        existing.score += hit.score * 0.4; // 40% weight for semantic
      } else {
        resultMap.set(hit.id, {
          ...hit,
          score: hit.score * 0.4,
        });
      }
    }

    // Sort by combined score
    const results = Array.from(resultMap.values()).sort((a, b) => b.score - a.score);

    return {
      results,
      total: results.length,
      took: keywordResults.took + semanticResults.took,
      searchType: 'hybrid',
      query: keywordResults.query,
    };
  }

  async indexDocument(index: string, id: string, document: Record<string, any>): Promise<void> {
    // Generate embedding for document using language-aware service
    const textContent = this.extractTextContent(document);
    const embeddingResult = await this.unifiedEmbeddingService.embed(textContent);
    
    // Store embedding in the appropriate dimension-specific field
    const embeddingField = embeddingResult.dimensions === 768 
      ? 'embedding_768' 
      : 'embedding_384';

    // Add embedding and metadata to document
    const docWithEmbedding = {
      ...document,
      [embeddingField]: embeddingResult.embedding,
      embedding_model: embeddingResult.model,
      detected_language: embeddingResult.language,
    };

    await this.openSearchService.indexDocument(index, id, docWithEmbedding);
  }

  private extractTextContent(document: Record<string, any>): string {
    // Extract searchable text fields
    const textFields = ['name', 'title', 'description', 'content', 'tags'];
    const texts: string[] = [];

    for (const field of textFields) {
      if (document[field]) {
        texts.push(String(document[field]));
      }
    }

    return texts.join(' ');
  }
}
