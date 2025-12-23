'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, MapPin, Filter, Star, Clock, IndianRupee, Store } from 'lucide-react';
import { searchAPIClient } from '@/lib/api/search-api';
import type { ModuleType } from '@/types/search';

interface SearchResult {
  id: string;
  name: string;
  description?: string;
  price?: number;
  veg?: number;
  avg_rating?: number;
  image_url?: string;
  store_name?: string;
  distance_km?: number;
  delivery_time?: string;
}

const modules: { id: ModuleType; name: string; icon: string; color: string }[] = [
  { id: 'food', name: 'Food', icon: '🍕', color: 'from-orange-500 to-red-500' },
  { id: 'ecom', name: 'Shopping', icon: '🛍️', color: 'from-blue-500 to-purple-500' },
  { id: 'rooms', name: 'Rooms', icon: '🏨', color: 'from-pink-500 to-rose-500' },
  { id: 'movies', name: 'Movies', icon: '🎬', color: 'from-purple-500 to-indigo-500' },
  { id: 'services', name: 'Services', icon: '💼', color: 'from-green-500 to-teal-500' },
];

export default function SearchPage() {
  const [selectedModule, setSelectedModule] = useState<ModuleType>('food');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [vegFilter, setVegFilter] = useState<'all' | '1' | '0'>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [ratingMin, setRatingMin] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
          // Default to Nashik
          setLocation({ lat: 19.9975, lon: 73.7898 });
        }
      );
    } else {
      // Default to Nashik
      setLocation({ lat: 19.9975, lon: 73.7898 });
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const filters: Record<string, string | number> = {};
      
      if (vegFilter !== 'all') {
        filters.veg = vegFilter;
      }
      
      if (priceRange[0] > 0) {
        filters.price_min = priceRange[0];
      }
      
      if (priceRange[1] < 1000) {
        filters.price_max = priceRange[1];
      }
      
      if (ratingMin > 0) {
        filters.rating_min = ratingMin;
      }
      
      if (location) {
        filters.lat = location.lat;
        filters.lon = location.lon;
        filters.radius_km = 10;
      }

      const response = await searchAPIClient.search(query, {
        module: selectedModule,
        filters,
        page: 1,
        limit: 20,
      });

      setResults(response.items || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#fffff6]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔍 Mangwale Search</h1>
          <p className="text-green-100">Find anything across all modules</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Module Selector */}
        <div className="mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all transform hover:scale-105 whitespace-nowrap ${
                  selectedModule === module.id
                    ? `bg-gradient-to-r ${module.color} text-white shadow-lg`
                    : 'bg-white border-2 border-gray-200 hover:border-[#059211]'
                }`}
              >
                <span className="text-2xl">{module.icon}</span>
                <span>{module.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Search ${modules.find(m => m.id === selectedModule)?.name.toLowerCase()}...`}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-[#059211] focus:outline-none text-lg shadow-md"
              />
            </div>
            
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-2xl font-medium hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Searching...</span>
                </div>
              ) : (
                'Search'
              )}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-4 rounded-2xl font-medium border-2 transition-all ${
                showFilters
                  ? 'bg-[#059211] text-white border-[#059211]'
                  : 'bg-white border-gray-200 hover:border-[#059211]'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-md">
              <h3 className="font-bold text-lg mb-4">Filters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Veg Filter */}
                {(selectedModule === 'food' || selectedModule === 'ecom') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dietary Preference
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: '1', label: '🟢 Veg' },
                        { value: '0', label: '🔴 Non-Veg' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setVegFilter(option.value as 'all' | '1' | '0')}
                          className={`flex-1 px-4 py-2 rounded-xl border-2 font-medium transition-all ${
                            vegFilter === option.value
                              ? 'bg-[#059211] text-white border-[#059211]'
                              : 'bg-white border-gray-200 hover:border-[#059211]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating: {ratingMin} ⭐
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={ratingMin}
                    onChange={(e) => setRatingMin(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Location Info */}
              {location && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-[#059211]" />
                  <span>Searching within 10km of your location</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Found {results.length} results
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#059211] transition-all hover:shadow-lg cursor-pointer overflow-hidden group"
                >
                  {/* Image */}
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-6xl">
                        {modules.find(m => m.id === selectedModule)?.icon}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg line-clamp-1">{item.name}</h3>
                        {item.store_name && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Store size={14} />
                            <span>{item.store_name}</span>
                          </div>
                        )}
                      </div>
                      {item.veg !== undefined && (
                        <span className="text-xl">
                          {item.veg === 1 ? '🟢' : '🔴'}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        {item.price && (
                          <div className="flex items-center gap-1 text-[#059211] font-bold text-lg">
                            <IndianRupee size={16} />
                            <span>{item.price}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-sm">
                          {item.avg_rating && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Star size={14} fill="currentColor" />
                              <span className="font-medium">{item.avg_rating.toFixed(1)}</span>
                            </div>
                          )}
                          
                          {item.delivery_time && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock size={14} />
                              <span>{item.delivery_time}</span>
                            </div>
                          )}
                          
                          {item.distance_km && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin size={14} />
                              <span>{item.distance_km.toFixed(1)}km</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Initial State */}
        {!query && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {modules.find(m => m.id === selectedModule)?.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              Search {modules.find(m => m.id === selectedModule)?.name}
            </h3>
            <p className="text-gray-600">
              Enter a search query to find items near you
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
