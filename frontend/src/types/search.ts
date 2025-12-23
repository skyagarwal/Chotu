// Search API Types

export type ModuleType = 'food' | 'ecom' | 'rooms' | 'movies' | 'services' | 'parcel' | 'ride' | 'health' | 'payment'

export interface SearchFilters {
  q?: string
  veg?: string | boolean
  category_id?: string | number
  brand?: string
  price_min?: number
  price_max?: number
  rating_min?: number
  lat?: number
  lon?: number
  radius_km?: number
  page?: number
  size?: number
  open_now?: boolean
  sort?: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'popularity'
}

export interface SearchItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  veg?: number
  avg_rating?: number
  store_id?: string
  store_name?: string
  category_id?: string
  category_name?: string
  brand?: string
  distance?: number
  available?: boolean
}

export interface SearchStore {
  id: string
  name: string
  description?: string
  logo?: string
  delivery_time?: string
  min_order?: number
  delivery_fee?: number
  avg_rating?: number
  location?: {
    lat: number
    lon: number
  }
  distance?: number
  open?: boolean
}

export interface SearchResponse {
  module: ModuleType
  q?: string
  filters?: SearchFilters
  items?: SearchItem[]
  stores?: SearchStore[]
  facets?: Record<string, Facet[]>
  meta: {
    total: number
    page?: number
    size?: number
  }
}

export interface Facet {
  value: string | number
  label?: string
  count: number
}

export interface SuggestResponse {
  module: ModuleType
  q: string
  items: SearchItem[]
  stores: SearchStore[]
  categories: Category[]
}

export interface Category {
  id: string
  name: string
  icon?: string
  count?: number
}

export interface TrendingQuery {
  module: ModuleType
  time_of_day: string
  q: string
  count: number
  total_results: number
}
