import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../../search/services/search.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Search Executor
 * 
 * Searches OpenSearch for products (food, ecommerce)
 */
@Injectable()
export class SearchExecutor implements ActionExecutor {
  readonly name = 'search';
  private readonly logger = new Logger(SearchExecutor.name);

  constructor(private readonly searchService: SearchService) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const type = config.type || 'search';
      const index = config.index as string || 'food_items';

      // Handle Category Fetching
      if (type === 'categories') {
        const limit = config.limit || 8;
        this.logger.debug(`Fetching popular categories from ${index}`);
        
        const categories = await this.searchService.getPopularCategories(index, limit);
        
        this.logger.debug(`Fetched categories: ${JSON.stringify(categories)}`);
        
        return {
          success: true,
          output: categories,
          event: 'success'
        };
      }

      // Handle Standard Search
      // Support both direct query and queryPath (read from context)
      let query = config.query as string;
      if (!query && config.queryPath) {
        query = context.data[config.queryPath] || context.data._user_message;
      }
      const limit = config.limit || config.size || 10;
      const filters = config.filters ? [...config.filters] : [];
      const lat = config.lat;
      const lng = config.lng;
      const radius = config.radius || '10km';

      // Log filters for debugging
      if (filters.length > 0) {
        this.logger.log(`🔍 Search filters from config: ${JSON.stringify(filters)}`);
      }

      if (!query) {
        return {
          success: false,
          error: 'Search query is required',
        };
      }

      // Add geo-location filter if coordinates provided
      if (lat && lng) {
        // Parse coordinates if they're strings (from Handlebars interpolation)
        const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
        const parsedLng = typeof lng === 'string' ? parseFloat(lng) : lng;
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          this.logger.log(`📍 Adding geo-distance filter: lat=${parsedLat}, lng=${parsedLng}, radius=${radius}`);
          // Use 'store_location' for food_items_v3, 'location' for other indices
          const geoField = index.includes('food_items') ? 'store_location' : 'location';
          filters.push({
            field: geoField,
            operator: 'geo_distance',
            value: { lat: parsedLat, lon: parsedLng, distance: radius }
          });
        } else {
          this.logger.warn(`⚠️ Invalid location coordinates: lat=${lat}, lng=${lng}`);
        }
      }

      // Log all filters before search
      this.logger.log(`🔍 Final search filters: ${JSON.stringify(filters)}`);
      this.logger.debug(`Searching ${index} for: "${query}"`);

      // Perform search
      const results = await this.searchService.search({
        index,
        query,
        limit,
        filters,
      });

      // Flatten results for easier template access - extract source and add id
      const flattenedItems = (results.results || []).map((item: any) => ({
        id: item.id,
        ...item.source, // Spread all source fields (title, mrp, brand, category, etc.)
      }));

      const output: any = {
        items: flattenedItems,
        total: results.total || 0,
        hasResults: flattenedItems.length > 0,
      };

      // S3 base URL for images (CDN has SSL issues)
      const S3_BASE = 'https://s3.ap-south-1.amazonaws.com/mangwale/product';

      // Helper to get proper image URL
      const getImageUrl = (item: any): string | undefined => {
        let imageUrl = item.image_full_url || item.image_fallback_url || item.image || item.images?.[0];
        if (!imageUrl) return undefined;
        if (!imageUrl.startsWith('http')) {
          return `${S3_BASE}/${imageUrl}`;
        }
        // Replace problematic CDN with S3
        if (imageUrl.includes('storage.mangwale.ai')) {
          return imageUrl.replace('https://storage.mangwale.ai/mangwale/product', S3_BASE);
        }
        return imageUrl;
      };

      // Always generate UI cards for product results
      if (output.hasResults) {
        output.cards = flattenedItems.slice(0, 10).map((item: any) => ({
          id: item.id,
          name: item.title || item.name,
          description: item.description || item.category,
          price: item.mrp ? `₹${item.mrp}` : (item.price ? `₹${item.price}` : undefined),
          image: getImageUrl(item),
          rating: item.rating || item.avg_rating || 4.5,
          deliveryTime: item.delivery_time || '30-45 min',
          brand: item.brand,
          category: item.category || item.category_name,
          storeName: item.store_name,
          storeId: item.store_id,
          // Store coordinates can be in store_location.lat/lon or store_latitude/store_longitude
          storeLat: item.store_location?.lat || item.store_latitude,
          storeLng: item.store_location?.lon || item.store_longitude,
          veg: item.veg,
          action: {
            label: 'Add +',
            value: `Add ${item.title || item.name} to cart`
          }
        }));
      }

      this.logger.debug(`Found ${output.total} results`);

      // Determine event based on results
      const event = output.hasResults ? 'items_found' : 'no_items';

      return {
        success: true,
        output,
        event,
      };
    } catch (error) {
      this.logger.error(`Search execution failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validate(config: Record<string, any>): boolean {
    if (config.type === 'categories') return true;
    return !!(config.query || config.queryPath);
  }
}
