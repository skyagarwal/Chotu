import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SearchModule {
  id: number;
  module_type: string;
  name: string;
  slug: string;
  opensearch_index: string | null;
  status: number;
}

/**
 * Module Service - Integrates with Search API module system
 * Fetches module configuration and maps modules to OpenSearch indices
 */
@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);
  private readonly searchApiUrl: string;
  private modulesCache: SearchModule[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.searchApiUrl = this.config.get('SEARCH_API_URL', 'http://localhost:3100');
  }

  /**
   * Get all active modules from Search API
   */
  async getActiveModules(): Promise<SearchModule[]> {
    // Return cached modules if still valid
    if (this.modulesCache && Date.now() < this.cacheExpiry) {
      return this.modulesCache;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.searchApiUrl}/modules/active`),
      );

      this.modulesCache = response.data as SearchModule[];
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      
      this.logger.log(`Loaded ${this.modulesCache.length} active modules from Search API`);
      return this.modulesCache;
    } catch (error) {
      this.logger.error(`Failed to fetch modules: ${error.message}`);
      
      // Return default modules as fallback
      return this.getDefaultModules();
    }
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: number): Promise<SearchModule | null> {
    const modules = await this.getActiveModules();
    return modules.find(m => m.id === id) || null;
  }

  /**
   * Get modules by type (food, ecommerce, etc.)
   */
  async getModulesByType(type: string): Promise<SearchModule[]> {
    const modules = await this.getActiveModules();
    return modules.filter(m => m.module_type === type);
  }

  /**
   * Get index name for a module
   */
  getIndexForModule(module: SearchModule, target: 'items' | 'stores' = 'items'): string {
    // Use opensearch_index from database if available
    if (module.opensearch_index) {
      return target === 'stores' 
        ? `${module.opensearch_index}_stores` 
        : module.opensearch_index;
    }

    // Fallback to module_type mapping
    const typeMap: Record<string, string> = {
      food: target === 'stores' ? 'food_stores' : 'food_items',
      ecommerce: target === 'stores' ? 'ecom_stores' : 'ecom_items',
      grocery: target === 'stores' ? 'ecom_stores' : 'ecom_items',
      parcel: 'parcel_items',
      pharmacy: 'pharmacy_items',
      rooms: target === 'stores' ? 'rooms_stores' : 'rooms_index',
      movies: target === 'stores' ? 'movies_showtimes' : 'movies_catalog',
      services: target === 'stores' ? 'services_stores' : 'services_index',
    };

    return typeMap[module.module_type] || 'food_items';
  }

  /**
   * Default modules fallback
   */
  private getDefaultModules(): SearchModule[] {
    return [
      {
        id: 4,
        module_type: 'food',
        name: 'Food',
        slug: 'food',
        opensearch_index: 'food_items',
        status: 1,
      },
      {
        id: 5,
        module_type: 'ecommerce',
        name: 'Shop',
        slug: 'shop',
        opensearch_index: 'ecom_items',
        status: 1,
      },
    ];
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.modulesCache = null;
    this.cacheExpiry = 0;
  }
}
