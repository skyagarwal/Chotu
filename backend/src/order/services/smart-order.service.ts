import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchService } from '../../search/services/search.service';
import { PhpStoreService } from '../../php-integration/services/php-store.service';

export interface ExtractedOrderDetails {
  restaurant?: string;
  items?: Array<{ name: string; quantity: number }>;
  cuisine?: string;
  deliveryLocation?: string;
  pickupFrom?: string;
  pickupItem?: string;
  contactName?: string;
  isHomeDelivery?: boolean;
}

export interface ExternalRestaurantInfo {
  name: string;
  address: string;
  phone?: string;
  distance?: string;
  rating?: number;
  source: 'google' | 'yelp' | 'manual';
  placeId?: string;
}

export interface ParcelCategory {
  category: 'food' | 'documents' | 'clothes' | 'electronics' | 'fragile' | 'other';
  requiresSpecialHandling: boolean;
  suggestedInstructions?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  description?: string;
  address?: string;
  image?: string;
  rating?: number;
  storeId?: string;
  price?: number;
  source: 'opensearch' | 'php_fallback';
}

export interface UserContact {
  name: string;
  phone: string;
  address?: string;
}

@Injectable()
export class SmartOrderService {
  private readonly logger = new Logger(SmartOrderService.name);
  private googleMapsApiKey: string;
  private phpApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly searchService: SearchService,
    private readonly phpStoreService: PhpStoreService,
  ) {
    this.googleMapsApiKey = this.configService.get('GOOGLE_MAPS_API_KEY', '');
    this.phpApiUrl = this.configService.get('PHP_API_URL', 'http://localhost:8000');
  }

  /**
   * Analyze user's natural language request and extract order details
   */
  async analyzeUserRequest(input: string): Promise<{
    type: 'food_order' | 'pickup_request' | 'parcel_request' | 'unclear';
    details: ExtractedOrderDetails;
    confidence: number;
  }> {
    const normalizedInput = input.toLowerCase();

    // Keywords for different request types
    const foodKeywords = ['order', 'food', 'eat', 'hungry', 'restaurant', 'pizza', 'burger', 'biryani', 'missal', 'pav'];
    const pickupKeywords = ['pick up', 'pickup', 'collect', 'get from', 'bring from', 'fetch'];
    const parcelKeywords = ['send', 'deliver', 'parcel', 'courier', 'package'];

    let type: 'food_order' | 'pickup_request' | 'parcel_request' | 'unclear' = 'unclear';
    let confidence = 0;

    // Determine request type
    const hasFoodKeyword = foodKeywords.some(k => normalizedInput.includes(k));
    const hasPickupKeyword = pickupKeywords.some(k => normalizedInput.includes(k));
    const hasParcelKeyword = parcelKeywords.some(k => normalizedInput.includes(k));

    if (hasFoodKeyword && !hasPickupKeyword) {
      type = 'food_order';
      confidence = 0.85;
    } else if (hasPickupKeyword) {
      type = 'pickup_request';
      confidence = 0.9;
    } else if (hasParcelKeyword) {
      type = 'parcel_request';
      confidence = 0.85;
    }

    // Extract details based on type
    const details = await this.extractOrderDetails(input, type);

    return { type, details, confidence };
  }

  /**
   * Extract structured order details from natural language
   */
  async extractOrderDetails(input: string, type: string): Promise<ExtractedOrderDetails> {
    const details: ExtractedOrderDetails = {};
    const normalizedInput = input.toLowerCase();

    // Extract restaurant name (look for "from [restaurant]" pattern)
    const fromMatch = input.match(/from\s+([a-zA-Z\s]+?)(?:\s+to|\s*$|,)/i);
    if (fromMatch) {
      details.restaurant = fromMatch[1].trim();
    }

    // Extract items with quantities (e.g., "1 plate missal", "2 vada pav")
    const itemMatches = input.matchAll(/(\d+)\s*(plate|plates|pcs|piece|pieces|nos|no)?\s*([a-zA-Z\s]+?)(?:,|and|from|\s*$)/gi);
    details.items = [];
    for (const match of itemMatches) {
      details.items.push({
        quantity: parseInt(match[1]),
        name: match[3].trim(),
      });
    }

    // Extract delivery location
    if (normalizedInput.includes('to home') || normalizedInput.includes('at home')) {
      details.isHomeDelivery = true;
    } else {
      const toMatch = input.match(/to\s+([a-zA-Z0-9\s,]+?)(?:\s*$|\.)/i);
      if (toMatch) {
        details.deliveryLocation = toMatch[1].trim();
      }
    }

    // For pickup requests, extract contact name
    if (type === 'pickup_request') {
      // Pattern: "from my friend Suresh" or "from Suresh"
      const contactMatch = input.match(/from\s+(?:my\s+)?(?:friend\s+)?([A-Z][a-z]+)/i);
      if (contactMatch) {
        details.contactName = contactMatch[1];
        details.pickupFrom = contactMatch[1];
      }

      // Extract what to pick up
      const pickupItemMatch = input.match(/pick\s*up\s+(?:my\s+)?([a-zA-Z\s]+?)(?:\s+from|$)/i);
      if (pickupItemMatch) {
        details.pickupItem = pickupItemMatch[1].trim();
      }
    }

    return details;
  }

  /**
   * Search for restaurant/store in Mangwale partner network using OpenSearch
   * Falls back to PHP API if OpenSearch fails
   */
  async searchMangwaleNetwork(
    restaurantName: string,
    userLocation?: { lat: number; lng: number },
  ): Promise<{
    found: boolean;
    restaurants: SearchResult[];
    exactMatch: boolean;
  }> {
    try {
      // Primary: Search via OpenSearch (through SearchService)
      const searchResult = await this.searchService.moduleStoresSearch('food', restaurantName, {});
      
      const restaurants: SearchResult[] = (searchResult?.results || []).map((hit: any) => ({
        id: hit.id || hit._id,
        name: hit.source?.name || hit.name,
        description: hit.source?.description || hit.description,
        address: hit.source?.address || hit.address,
        image: hit.source?.image || hit.image,
        rating: hit.source?.rating || hit.rating,
        storeId: hit.source?.store_id || hit.storeId,
        source: 'opensearch' as const,
      }));

      const exactMatch = restaurants.some(
        r => r.name.toLowerCase() === restaurantName.toLowerCase(),
      );

      this.logger.log(`OpenSearch found ${restaurants.length} restaurants for "${restaurantName}"`);

      return {
        found: restaurants.length > 0,
        restaurants,
        exactMatch,
      };
    } catch (error) {
      this.logger.warn(`OpenSearch failed, falling back to PHP API: ${error.message}`);
      
      // Fallback: Search via PHP API
      try {
        const phpResult = await this.phpStoreService.searchStores(restaurantName);
        
        const restaurants: SearchResult[] = (phpResult?.data || []).map((store: any) => ({
          id: String(store.id),
          name: store.name,
          description: store.description,
          address: store.address,
          image: store.logo || store.image,
          rating: store.rating,
          storeId: String(store.id),
          source: 'php_fallback' as const,
        }));

        const exactMatch = restaurants.some(
          r => r.name.toLowerCase() === restaurantName.toLowerCase(),
        );

        this.logger.log(`PHP fallback found ${restaurants.length} restaurants for "${restaurantName}"`);

        return {
          found: restaurants.length > 0,
          restaurants,
          exactMatch,
        };
      } catch (phpError) {
        this.logger.error('PHP fallback also failed:', phpError);
        return { found: false, restaurants: [], exactMatch: false };
      }
    }
  }

  /**
   * Search for menu items in Mangwale network
   */
  async searchMenuItems(
    itemName: string,
    restaurantId?: string,
  ): Promise<{
    found: boolean;
    items: SearchResult[];
  }> {
    try {
      // Search via OpenSearch
      const filters: Record<string, string> = {};
      if (restaurantId) {
        filters.store_id = restaurantId;
      }
      
      const searchResult = await this.searchService.moduleSearch('food', itemName, filters);
      
      const items: SearchResult[] = (searchResult?.results || []).map((hit: any) => ({
        id: hit.id || hit._id,
        name: hit.source?.name || hit.name,
        description: hit.source?.description || hit.description,
        price: hit.source?.price || hit.price,
        image: hit.source?.image || hit.image,
        storeId: hit.source?.store_id || hit.storeId,
        source: 'opensearch' as const,
      }));

      return {
        found: items.length > 0,
        items,
      };
    } catch (error) {
      this.logger.warn(`Item search failed: ${error.message}`);
      
      // Fallback to PHP
      try {
        const phpResult = await this.phpStoreService.searchItems(itemName);
        
        const items: SearchResult[] = (phpResult?.data || []).map((item: any) => ({
          id: String(item.id),
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          storeId: String(item.store_id),
          source: 'php_fallback' as const,
        }));

        return {
          found: items.length > 0,
          items,
        };
      } catch (phpError) {
        this.logger.error('PHP item search also failed:', phpError);
        return { found: false, items: [] };
      }
    }
  }

  /**
   * Search external sources (Google Places) for restaurant not in network
   */
  async searchExternalRestaurant(
    restaurantName: string,
    userLocation: { lat: number; lng: number },
  ): Promise<ExternalRestaurantInfo | null> {
    if (!this.googleMapsApiKey) {
      this.logger.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: {
            query: `${restaurantName} restaurant`,
            location: `${userLocation.lat},${userLocation.lng}`,
            radius: 10000,
            key: this.googleMapsApiKey,
          },
        }),
      );

      const results = response.data.results;
      if (results && results.length > 0) {
        const place = results[0];
        
        // Get place details for phone number
        let phone: string | undefined;
        try {
          const detailsResponse = await firstValueFrom(
            this.httpService.get('https://maps.googleapis.com/maps/api/place/details/json', {
              params: {
                place_id: place.place_id,
                fields: 'formatted_phone_number',
                key: this.googleMapsApiKey,
              },
            }),
          );
          phone = detailsResponse.data.result?.formatted_phone_number;
        } catch (e) {
          this.logger.warn('Could not get phone number for place');
        }

        return {
          name: place.name,
          address: place.formatted_address,
          phone,
          rating: place.rating,
          distance: this.calculateDistance(userLocation, place.geometry.location),
          source: 'google',
          placeId: place.place_id,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Error searching external restaurant:', error);
      return null;
    }
  }

  /**
   * Search user's phone book contacts via PHP API
   * This requires the user to have synced contacts through the mobile app
   */
  async searchUserContacts(
    userId: string,
    query: string,
  ): Promise<UserContact[]> {
    try {
      // Call PHP API to search user contacts
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpApiUrl}/api/v1/users/${userId}/contacts`, {
          params: { search: query },
        }),
      );

      const contacts = response.data?.data || [];
      
      return contacts.map((c: any) => ({
        name: c.name,
        phone: c.phone,
        address: c.address || undefined,
      }));
    } catch (error) {
      this.logger.warn(`Error searching contacts for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Get user's saved addresses from PHP API
   */
  async getUserAddresses(userId: string): Promise<Array<{
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
    isDefault: boolean;
  }>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.phpApiUrl}/api/v1/users/${userId}/addresses`),
      );

      return (response.data?.data || []).map((addr: any) => ({
        id: String(addr.id),
        label: addr.label || addr.address_type || 'Address',
        address: addr.address,
        lat: parseFloat(addr.latitude) || 0,
        lng: parseFloat(addr.longitude) || 0,
        isDefault: addr.is_default || false,
      }));
    } catch (error) {
      this.logger.warn(`Error getting addresses for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Classify parcel category based on item description
   */
  classifyParcelCategory(itemDescription: string): ParcelCategory {
    const normalizedItem = itemDescription.toLowerCase();

    // Food items
    const foodKeywords = ['food', 'lunch', 'dinner', 'breakfast', 'tiffin', 'meal', 'pizza', 'burger', 'biryani'];
    if (foodKeywords.some(k => normalizedItem.includes(k))) {
      return {
        category: 'food',
        requiresSpecialHandling: true,
        suggestedInstructions: 'Keep upright, deliver quickly',
      };
    }

    // Documents
    const docKeywords = ['document', 'paper', 'file', 'certificate', 'passport', 'id', 'letter'];
    if (docKeywords.some(k => normalizedItem.includes(k))) {
      return {
        category: 'documents',
        requiresSpecialHandling: false,
      };
    }

    // Electronics
    const electronicKeywords = ['phone', 'laptop', 'tablet', 'charger', 'camera', 'watch', 'electronic'];
    if (electronicKeywords.some(k => normalizedItem.includes(k))) {
      return {
        category: 'electronics',
        requiresSpecialHandling: true,
        suggestedInstructions: 'Handle with care, fragile item',
      };
    }

    // Clothes
    const clothesKeywords = ['clothes', 'shirt', 'shoes', 'dress', 'jeans', 'jacket', 'bag'];
    if (clothesKeywords.some(k => normalizedItem.includes(k))) {
      return {
        category: 'clothes',
        requiresSpecialHandling: false,
      };
    }

    // Fragile items
    const fragileKeywords = ['glass', 'fragile', 'ceramic', 'cake', 'flower'];
    if (fragileKeywords.some(k => normalizedItem.includes(k))) {
      return {
        category: 'fragile',
        requiresSpecialHandling: true,
        suggestedInstructions: 'FRAGILE - Handle with extreme care',
      };
    }

    return {
      category: 'other',
      requiresSpecialHandling: false,
    };
  }

  /**
   * Calculate delivery fee for parcel
   */
  async calculateParcelFee(
    pickup: { lat: number; lng: number },
    drop: { lat: number; lng: number },
    category: string,
  ): Promise<{
    baseFee: number;
    distanceFee: number;
    categoryFee: number;
    totalFee: number;
    estimatedTime: string;
  }> {
    const distance = this.calculateDistanceKm(pickup, drop);
    
    // Base fee
    const baseFee = 30; // Base fee in local currency
    
    // Distance fee (per km after first 2km)
    const distanceFee = distance > 2 ? Math.ceil((distance - 2) * 10) : 0;
    
    // Category-based fee
    let categoryFee = 0;
    switch (category) {
      case 'food':
        categoryFee = 10; // Priority delivery
        break;
      case 'fragile':
      case 'electronics':
        categoryFee = 20; // Special handling
        break;
      default:
        categoryFee = 0;
    }

    const totalFee = baseFee + distanceFee + categoryFee;
    
    // Estimate time (3 mins per km + 5 mins buffer)
    const estimatedMinutes = Math.ceil(distance * 3) + 5;
    const estimatedTime = estimatedMinutes < 60 
      ? `${estimatedMinutes} mins` 
      : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;

    return {
      baseFee,
      distanceFee,
      categoryFee,
      totalFee,
      estimatedTime,
    };
  }

  /**
   * Create a parcel order via PHP API (for items not on Mangwale network)
   */
  async createParcelOrder(params: {
    userId: string;
    pickupLocation: { address: string; lat: number; lng: number };
    dropLocation: { address: string; lat: number; lng: number };
    category: string;
    notes: string;
    orderType: 'parcel_pickup' | 'custom_parcel';
    externalRestaurantInfo?: ExternalRestaurantInfo;
  }): Promise<{ orderId: string; success: boolean; message?: string }> {
    try {
      const fee = await this.calculateParcelFee(
        params.pickupLocation,
        params.dropLocation,
        params.category,
      );

      // Create order via PHP API
      const response = await firstValueFrom(
        this.httpService.post(`${this.phpApiUrl}/api/v1/parcel-orders`, {
          user_id: params.userId,
          order_type: params.orderType,
          pickup_address: params.pickupLocation.address,
          pickup_latitude: params.pickupLocation.lat,
          pickup_longitude: params.pickupLocation.lng,
          drop_address: params.dropLocation.address,
          drop_latitude: params.dropLocation.lat,
          drop_longitude: params.dropLocation.lng,
          parcel_category: params.category,
          notes: params.notes,
          delivery_fee: fee.totalFee,
          total_amount: fee.totalFee,
          estimated_time: fee.estimatedTime,
          external_restaurant: params.externalRestaurantInfo || null,
        }),
      );

      const orderId = response.data?.data?.id || response.data?.order_id;
      
      this.logger.log(`Created parcel order ${orderId} for user ${params.userId}`);

      return { orderId: String(orderId), success: true };
    } catch (error) {
      this.logger.error('Error creating parcel order:', error.message);
      return { 
        orderId: '', 
        success: false, 
        message: error.response?.data?.message || 'Failed to create order',
      };
    }
  }

  /**
   * Find similar restaurants in network using OpenSearch
   */
  async findSimilarRestaurants(
    cuisine: string,
    items: string[],
    userLocation: { lat: number; lng: number },
  ): Promise<SearchResult[]> {
    try {
      // Search for stores with similar cuisine or items
      const searchQueries = [cuisine, ...items].filter(Boolean);
      const query = searchQueries.join(' ');
      
      const searchResult = await this.searchService.moduleStoresSearch('food', query, {});
      
      const restaurants: SearchResult[] = (searchResult?.results || []).map((hit: any) => ({
        id: hit.id || hit._id,
        name: hit.source?.name || hit.name,
        description: hit.source?.description || hit.description,
        address: hit.source?.address || hit.address,
        image: hit.source?.image || hit.image,
        rating: hit.source?.rating || hit.rating,
        storeId: hit.source?.store_id || hit.storeId,
        source: 'opensearch' as const,
      }));

      // Sort by distance if we have location info in results
      // For now, return as-is since OpenSearch should handle relevance
      return restaurants.slice(0, 5);
    } catch (error) {
      this.logger.error('Error finding similar restaurants:', error);
      
      // Fallback to PHP
      try {
        const phpResult = await this.phpStoreService.searchStores(cuisine);
        
        return (phpResult?.data || []).slice(0, 5).map((store: any) => ({
          id: String(store.id),
          name: store.name,
          description: store.description,
          address: store.address,
          image: store.logo || store.image,
          rating: store.rating,
          storeId: String(store.id),
          source: 'php_fallback' as const,
        }));
      } catch (phpError) {
        this.logger.error('PHP fallback also failed:', phpError);
        return [];
      }
    }
  }

  private calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): string {
    const km = this.calculateDistanceKm(from, to);
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  }

  private calculateDistanceKm(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) *
        Math.cos(this.toRad(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
