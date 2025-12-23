import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface NLUOutput {
  module_id: number;          // 3=parcel, 4=food, 5=ecom
  module_type: string;        // 'parcel' | 'food' | 'ecommerce'
  intent: string;             // 'intent.item.search' | 'intent.order.place'
  entities: Record<string, any>;
  confidence: number;
  text: string;
}

export interface SearchRouting {
  service: 'opensearch' | 'php' | 'both';
  endpoint: string;
  params: Record<string, any>;
  fallback?: string;
}

export interface SearchResult {
  source: 'opensearch' | 'php' | 'hybrid';
  data: any;
  fallback: boolean;
  routing: SearchRouting;
  performance: {
    primary_ms?: number;
    fallback_ms?: number;
    total_ms: number;
  };
}

@Injectable()
export class SearchOrchestrator {
  private readonly logger = new Logger(SearchOrchestrator.name);
  private opensearchClient: AxiosInstance;
  private phpClient: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    // Search API client (standalone OpenSearch service)
    const searchApiUrl = this.config.get<string>('SEARCH_API_URL') || 'http://localhost:3100';
    this.opensearchClient = axios.create({
      baseURL: searchApiUrl,
      timeout: 3000, // 3 second timeout for search
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.logger.log(`Search API configured: ${searchApiUrl}`);

    // PHP API client (legacy backend fallback)
    const phpApiUrl = this.config.get<string>('PHP_API_BASE_URL') || this.config.get<string>('PHP_BACKEND_URL') || 'http://localhost:8090/api/v1';
    this.phpClient = axios.create({
      baseURL: phpApiUrl,
      timeout: 5000, // 5 second timeout for PHP
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    this.logger.log(`PHP API configured: ${phpApiUrl}`);
  }

  /**
   * Main routing function: Analyzes NLU output and routes to appropriate service
   */
  async route(nluOutput: NLUOutput, userContext?: any): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Determine routing based on intent
    if (this.isSearchIntent(nluOutput.intent)) {
      return this.routeToOpenSearch(nluOutput, userContext, startTime);
    } else if (this.isTransactionIntent(nluOutput.intent)) {
      return this.routeToPHP(nluOutput, userContext, startTime);
    } else if (this.isHybridIntent(nluOutput.intent)) {
      return this.routeHybrid(nluOutput, userContext, startTime);
    }

    throw new Error(`Unknown intent type: ${nluOutput.intent}`);
  }

  /**
   * Check if intent is search-related (should route to OpenSearch)
   */
  private isSearchIntent(intent: string): boolean {
    const searchIntents = [
      'intent.item.search',
      'intent.store.search',
      'intent.category.browse',
      'intent.semantic.search',
      'intent.recommendations',
      'intent.suggest',
    ];
    return searchIntents.includes(intent);
  }

  /**
   * Check if intent is transaction-related (should route to PHP)
   */
  private isTransactionIntent(intent: string): boolean {
    const transactionIntents = [
      'intent.order.place',
      'intent.order.track',
      'intent.order.cancel',
      'intent.parcel.place',
      'intent.parcel.track',
      'intent.parcel.cancel',
      'intent.cart.add',
      'intent.cart.update',
      'intent.payment.create',
    ];
    return transactionIntents.includes(intent);
  }

  /**
   * Check if intent requires both services (hybrid)
   */
  private isHybridIntent(intent: string): boolean {
    const hybridIntents = [
      'intent.store.details', // OpenSearch for info, PHP for live status
    ];
    return hybridIntents.includes(intent);
  }

  /**
   * Route to OpenSearch API with PHP fallback
   */
  private async routeToOpenSearch(
    nluOutput: NLUOutput,
    userContext: any,
    startTime: number
  ): Promise<SearchResult> {
    const routing = this.buildOpenSearchRouting(nluOutput, userContext);
    
    try {
      // Try OpenSearch first
      const opensearchStart = Date.now();
      const response = await this.opensearchClient.get(routing.endpoint, {
        params: routing.params,
      });
      const opensearchTime = Date.now() - opensearchStart;

      // Check if we got meaningful results
      if (this.hasResults(response.data)) {
        this.logger.log(`OpenSearch success: ${routing.endpoint} (${opensearchTime}ms)`);
        return {
          source: 'opensearch',
          data: response.data,
          fallback: false,
          routing,
          performance: {
            primary_ms: opensearchTime,
            total_ms: Date.now() - startTime,
          },
        };
      }

      // Empty results, try fallback
      this.logger.warn(`OpenSearch returned empty results, trying PHP fallback`);
      return this.fallbackToPHP(nluOutput, userContext, startTime, opensearchTime);

    } catch (error) {
      this.logger.error(`OpenSearch error: ${error.message}`);
      return this.fallbackToPHP(nluOutput, userContext, startTime);
    }
  }

  /**
   * Fallback to PHP API when OpenSearch fails or returns empty
   */
  private async fallbackToPHP(
    nluOutput: NLUOutput,
    userContext: any,
    startTime: number,
    primaryTime?: number
  ): Promise<SearchResult> {
    const routing = this.buildPHPRouting(nluOutput, userContext);
    
    try {
      const phpStart = Date.now();
      const response = await this.phpClient.request({
        method: routing.params.method || 'GET',
        url: routing.endpoint,
        params: routing.params.method === 'GET' ? routing.params : undefined,
        data: routing.params.method !== 'GET' ? routing.params : undefined,
      });
      const phpTime = Date.now() - phpStart;

      this.logger.log(`PHP fallback success: ${routing.endpoint} (${phpTime}ms)`);
      return {
        source: 'php',
        data: response.data,
        fallback: true,
        routing,
        performance: {
          primary_ms: primaryTime,
          fallback_ms: phpTime,
          total_ms: Date.now() - startTime,
        },
      };

    } catch (error) {
      this.logger.error(`PHP fallback failed: ${error.message}`);
      throw new Error('All search services unavailable');
    }
  }

  /**
   * Route directly to PHP API (for transactions)
   */
  private async routeToPHP(
    nluOutput: NLUOutput,
    userContext: any,
    startTime: number
  ): Promise<SearchResult> {
    const routing = this.buildPHPRouting(nluOutput, userContext);
    
    try {
      const response = await this.phpClient.request({
        method: routing.params.method || 'POST',
        url: routing.endpoint,
        params: routing.params.method === 'GET' ? routing.params : undefined,
        data: routing.params.method !== 'GET' ? routing.params : undefined,
      });

      return {
        source: 'php',
        data: response.data,
        fallback: false,
        routing,
        performance: {
          total_ms: Date.now() - startTime,
        },
      };

    } catch (error) {
      this.logger.error(`PHP request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Route to both services and merge results
   */
  private async routeHybrid(
    nluOutput: NLUOutput,
    userContext: any,
    startTime: number
  ): Promise<SearchResult> {
    const [opensearchResult, phpResult] = await Promise.allSettled([
      this.routeToOpenSearch(nluOutput, userContext, startTime),
      this.routeToPHP(nluOutput, userContext, startTime),
    ]);

    // Merge results
    const merged = {
      opensearch: opensearchResult.status === 'fulfilled' ? opensearchResult.value.data : null,
      php: phpResult.status === 'fulfilled' ? phpResult.value.data : null,
    };

    return {
      source: 'hybrid',
      data: merged,
      fallback: false,
      routing: {
        service: 'both',
        endpoint: 'hybrid',
        params: {},
      },
      performance: {
        total_ms: Date.now() - startTime,
      },
    };
  }

  /**
   * Build OpenSearch API routing configuration
   */
  private buildOpenSearchRouting(nluOutput: NLUOutput, userContext: any): SearchRouting {
    const { intent, module_id, module_type, entities } = nluOutput;
    const params: Record<string, any> = {};

    // Add module filter
    params.module_id = module_id;

    // Add user context (location)
    if (userContext?.lat && userContext?.lon) {
      params.lat = userContext.lat;
      params.lon = userContext.lon;
      params.radius_km = userContext.radius_km || 5;
    }

    // Build endpoint and params based on intent
    let endpoint = '/search';

    switch (intent) {
      case 'intent.item.search':
        endpoint = `/search/${module_type}`;
        params.q = entities.query || entities.item || '';
        if (entities.veg !== undefined) params.veg = entities.veg ? '1' : '0';
        if (entities.category_id) params.category_id = entities.category_id;
        if (entities.price_min) params.price_min = entities.price_min;
        if (entities.price_max) params.price_max = entities.price_max;
        if (entities.rating_min) params.rating_min = entities.rating_min;
        if (entities.store_id) params.store_id = entities.store_id;
        break;

      case 'intent.store.search':
        endpoint = `/search/${module_type}/stores`;
        params.q = entities.query || entities.store || '';
        if (entities.delivery_time_max) params.delivery_time_max = entities.delivery_time_max;
        break;

      case 'intent.category.browse':
        endpoint = `/search/${module_type}/category`;
        params.category_id = entities.category_id;
        params.sort = entities.sort || 'distance';
        if (entities.veg !== undefined) params.veg = entities.veg ? '1' : '0';
        break;

      case 'intent.semantic.search':
        endpoint = `/search/semantic/${module_type}`;
        params.q = entities.query || entities.description || '';
        if (entities.veg !== undefined) params.veg = entities.veg ? '1' : '0';
        break;

      case 'intent.recommendations':
        endpoint = `/search/recommendations/${entities.item_id}`;
        params.module_id = module_id;
        params.limit = entities.limit || 5;
        if (entities.store_id) params.store_id = entities.store_id;
        break;

      case 'intent.suggest':
        endpoint = `/search/${module_type}/suggest`;
        params.q = entities.query || '';
        params.size = entities.size || 5;
        break;

      default:
        // Unified search endpoint
        params.q = entities.query || '';
    }

    return {
      service: 'opensearch',
      endpoint,
      params,
      fallback: 'php',
    };
  }

  /**
   * Build PHP API routing configuration
   */
  private buildPHPRouting(nluOutput: NLUOutput, userContext: any): SearchRouting {
    const { intent, module_id, entities } = nluOutput;
    const params: Record<string, any> = { module_id };

    let endpoint = '';
    let method = 'GET';

    switch (intent) {
      case 'intent.item.search':
        endpoint = '/items/search';
        params.name = entities.query || entities.item;
        if (entities.zone_id) params.zone_id = entities.zone_id;
        break;

      case 'intent.store.search':
        endpoint = '/stores/search';
        params.name = entities.query || entities.store;
        if (entities.zone_id) params.zone_id = entities.zone_id;
        break;

      case 'intent.order.place':
        endpoint = '/customer/order/place';
        method = 'POST';
        params.method = 'POST';
        params.cart_id = entities.cart_id;
        params.address_id = entities.address_id || userContext?.address_id;
        params.payment_method = entities.payment_method || 'cash_on_delivery';
        params.order_type = entities.order_type || 'delivery';
        break;

      case 'intent.order.track':
        endpoint = '/customer/order/track';
        method = 'PUT';
        params.method = 'PUT';
        params.order_id = entities.order_id;
        break;

      case 'intent.order.cancel':
        endpoint = '/customer/order/cancel';
        method = 'PUT';
        params.method = 'PUT';
        params.order_id = entities.order_id;
        params.reason = entities.reason || 'Customer request';
        break;

      case 'intent.parcel.place':
        endpoint = '/customer/order/place';
        method = 'POST';
        params.method = 'POST';
        params.order_type = 'parcel';
        params.pickup_address = entities.pickup_address;
        params.drop_address = entities.drop_address;
        params.parcel_category_id = entities.parcel_category_id || 1;
        params.package_description = entities.package_description;
        break;

      default:
        throw new Error(`Unsupported PHP intent: ${intent}`);
    }

    return {
      service: 'php',
      endpoint,
      params,
    };
  }

  /**
   * Check if response has meaningful results
   */
  private hasResults(data: any): boolean {
    if (!data) return false;
    
    // OpenSearch response structure
    if (data.items && Array.isArray(data.items)) {
      return data.items.length > 0;
    }
    
    // OpenSearch stores response
    if (data.stores && Array.isArray(data.stores)) {
      return data.stores.length > 0;
    }
    
    // Check meta.total
    if (data.meta?.total > 0) {
      return true;
    }
    
    return false;
  }
}
