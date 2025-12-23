// API Client for Search API (Port 3100)

import type {
  ModuleType,
  SearchFilters,
  SearchResponse,
  SuggestResponse,
  Category,
  TrendingQuery,
} from '@/types/search'

const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:3100'

interface SearchOptions {
  module: ModuleType
  filters?: SearchFilters
  page?: number
  limit?: number
}

interface SuggestOptions {
  module: ModuleType
  limit?: number
}

interface NaturalSearchOptions {
  query: string
  location?: { lat: number; lng: number }
  limit?: number
}

class SearchAPIClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = SEARCH_API_URL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Search API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Regular Search (OpenSearch) - Updated to match actual API
  async search(query: string, options: SearchOptions): Promise<SearchResponse> {
    const { module, filters = {}, page = 1, limit = 20 } = options
    
    // Build query params
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (page) params.append('page', page.toString());
    params.append('size', limit.toString());
    
    // Add all filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request<SearchResponse>(`/search/${module}?${queryString}`, {
      method: 'GET',
    });
  }

  // Natural Language Search (AI-powered)
  async naturalSearch(options: NaturalSearchOptions): Promise<SearchResponse> {
    return this.request<SearchResponse>('/search/natural', {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  // Auto-suggest
  async suggest(prefix: string, options: SuggestOptions): Promise<SuggestResponse> {
    const { module, limit = 10 } = options
    
    return this.request<SuggestResponse>(`/suggest/${module}?prefix=${encodeURIComponent(prefix)}&limit=${limit}`)
  }

  // Search Stores (restaurants, shops, hotels, etc.)
  async searchStores(module: ModuleType, filters: SearchFilters = {}): Promise<SearchResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request<SearchResponse>(`/search/${module}/stores?${queryString}`, {
      method: 'GET',
    });
  }

  // Fast Category-based Search (optimized for mobile)
  async searchByCategory(module: ModuleType, categoryId: number | string, filters: SearchFilters = {}): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append('category_id', String(categoryId));
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    return this.request<SearchResponse>(`/search/${module}/category?${queryString}`, {
      method: 'GET',
    });
  }

  // Get Categories for a module
  async getCategories(module: ModuleType): Promise<Category[]> {
    return this.request<Category[]>(`/categories/${module}`)
  }

  // Get Trending Queries
  async getTrendingQueries(module: ModuleType, limit = 10): Promise<TrendingQuery[]> {
    return this.request<TrendingQuery[]>(`/trending/${module}?limit=${limit}`)
  }

  // Get Featured/Popular Items
  async getFeaturedItems(module: ModuleType, limit = 10): Promise<SearchResponse> {
    return this.request<SearchResponse>(`/featured/${module}?limit=${limit}`)
  }

  // Module-specific searches
  
  // Food Module
  async searchRestaurants(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'food', filters })
  }

  // Ecom Module  
  async searchProducts(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'ecom', filters })
  }

  // Rooms Module
  async searchRooms(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'rooms', filters })
  }

  // Movies Module
  async searchMovies(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'movies', filters })
  }

  // Services Module
  async searchServices(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'services', filters })
  }

  // Parcel Module
  async searchParcels(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'parcel', filters })
  }

  // Ride Module
  async searchRides(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'ride', filters })
  }

  // Health Module
  async searchHealthProviders(query: string, filters?: SearchFilters) {
    return this.search(query, { module: 'health', filters })
  }
}

export const searchAPIClient = new SearchAPIClient()
