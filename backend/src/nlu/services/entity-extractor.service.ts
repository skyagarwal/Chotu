import { Injectable, Logger } from '@nestjs/common';

interface Entity {
  type: string;
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Enhanced Entity Extractor Service
 * 
 * Extracts ALL possible entities from text for:
 * 1. Immediate use in flow execution
 * 2. Training data collection for future SLOTS_MODEL
 * 3. Analytics and user understanding
 * 
 * Entity Types (for SLOTS_MODEL training):
 * - product_name: Food items, menu items
 * - restaurant_name: Restaurant/store names  
 * - quantity: Numbers, amounts
 * - phone: Phone numbers
 * - email: Email addresses
 * - location: Cities, addresses
 * - order_id: Order numbers
 * - date: Dates, days
 * - time: Time expressions
 * - price: Money amounts
 * - person_name: Names
 */
@Injectable()
export class EntityExtractorService {
  private readonly logger = new Logger(EntityExtractorService.name);

  // Common food items for extraction (including Hindi variations and misspellings)
  private readonly FOOD_ITEMS = [
    // Eggs - common Hindi variations & misspellings
    'egg', 'eggs', 'ande', 'anda', 'anndi', 'boiled egg', 'omelette', 'omlet',
    'half fry', 'bhurji', 'egg bhurji', 'anda bhurji',
    
    // Main courses
    'pizza', 'burger', 'biryani', 'paneer', 'chicken', 'mutton', 'fish',
    'dosa', 'idli', 'vada', 'samosa', 'pakora', 'paratha', 'roti', 'naan',
    'dal', 'rice', 'chawal', 'sabzi', 'curry', 'thali', 'combo',
    'momos', 'noodles', 'manchurian', 'fried rice', 'chowmein',
    'pasta', 'sandwich', 'wrap', 'roll', 'frankie',
    
    // Drinks
    'ice cream', 'kulfi', 'lassi', 'shake', 'juice', 'chai', 'coffee',
    
    // Indian dishes
    'butter masala', 'tikka', 'tandoori', 'kebab', 'korma',
    'chole', 'rajma', 'palak', 'aloo', 'gobi', 'matar',
    'paneer tikka', 'chicken tikka', 'dal makhani', 'dal tadka', 'dal yellow',
    'kadai paneer', 'shahi paneer', 'malai kofta', 'mix veg',
    
    // Desserts
    'gulab jamun', 'rasgulla', 'jalebi', 'kheer', 'halwa',
  ];

  // Restaurant name patterns (including Hindi patterns)
  private readonly RESTAURANT_PATTERNS = [
    // English patterns
    /(?:from\s+)([A-Z][a-zA-Z\s]+?)(?:\s+restaurant|\s+hotel|\s+cafe|\s+dhaba)?(?:\s|,|$)/i,
    /(?:at\s+)([A-Z][a-zA-Z\s]+?)(?:\s+restaurant|\s+hotel|\s+cafe|\s+dhaba)?(?:\s|,|$)/i,
    
    // Hindi patterns with cafe/restaurant/dhaba suffix: "inayat cafe se", "hotel taj se"
    /([a-zA-Z][a-zA-Z\s]*?)\s*(?:cafe|hotel|restaurant|dhaba)\s+se\b/i,
    
    // Multi-word names with "se": "bhagat tarachand se bhej do"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+se\s+(?:bhej|manga|lao|order)/i,
    
    // Generic "X se bhej/order" pattern - capture longer names
    /([a-zA-Z][a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+se\s+(?:bhej|manga|lao|order)/i,
    
    // Multi-word name at end: "from bhagat tarachand"
    /(?:from|se)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/i,
  ];
  
  // Words that are NOT restaurant names (action verbs, common words)
  private readonly NON_RESTAURANT_WORDS = [
    'the', 'a', 'my', 'your', 'this', 'that', 'i', 'we', 'me', 'mujhe',
    'order', 'bhej', 'manga', 'lao', 'karo', 'do', 'ghar', 'home', 'office',
    'jaldi', 'abhi', 'please', 'chahiye', 'want', 'need',
  ];

  // Hindi number words mapping
  private readonly HINDI_NUMBERS: Record<string, number> = {
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'panch': 5,
    'chhah': 6, 'chha': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
    'gyarah': 11, 'barah': 12, 'dozen': 12,
  };

  /**
   * Extract ALL entities from text - captures maximum data for training
   */
  async extract(
    text: string,
    intent: string,
    language: string = 'en',
  ): Promise<Record<string, any>> {
    const entities: Record<string, any> = {};
    
    // ALWAYS extract all entity types (for training data collection)
    // This ensures we capture maximum information regardless of intent

    // 1. Product/Food items
    const products = this.extractFoodItems(text);
    if (products.length > 0) {
      entities.product_name = products.length === 1 ? products[0] : products;
    }

    // 2. Restaurant/Store name
    const restaurant = this.extractRestaurantName(text);
    if (restaurant) entities.restaurant_name = restaurant;

    // 3. Quantity (simple)
    const quantity = this.extractQuantity(text);
    if (quantity) entities.quantity = quantity;

    // 3b. Cart items (structured for complex orders)
    const cartItems = this.extractCartItems(text);
    if (cartItems.length > 0) {
      entities.cart_items = cartItems;
    }

    // 4. Phone number
    const phone = this.extractPhoneNumber(text);
    if (phone) entities.phone = phone;

    // 5. Email
    const email = this.extractEmail(text);
    if (email) entities.email = email;

    // 6. Location/Address
    const location = this.extractLocation(text);
    if (location) entities.location = location;

    // 7. Order ID
    const orderId = this.extractOrderId(text);
    if (orderId) entities.order_id = orderId;

    // 8. Date
    const date = this.extractDate(text);
    if (date) entities.date = date;

    // 9. Time
    const time = this.extractTime(text);
    if (time) entities.time = time;

    // 10. Price/Amount
    const price = this.extractPrice(text);
    if (price) entities.price = price;

    // 11. Person name (for parcel/delivery)
    const personName = this.extractPersonName(text);
    if (personName) entities.person_name = personName;

    // 12. Urgency level
    const urgency = this.extractUrgency(text);
    if (urgency) entities.urgency = urgency;

    // 13. Delivery type (home/office)
    const deliveryType = this.extractDeliveryType(text);
    if (deliveryType) entities.delivery_type = deliveryType;

    // Log extraction for debugging
    if (Object.keys(entities).length > 0) {
      this.logger.debug(`Extracted entities from "${text.substring(0, 50)}...": ${JSON.stringify(entities)}`);
    }

    return entities;
  }

  /**
   * Extract food/product items from text
   */
  private extractFoodItems(text: string): string[] {
    const lowerText = text.toLowerCase();
    const found: string[] = [];
    
    // Words that indicate restaurant/location context, not food
    const restaurantWords = ['hotel', 'cafe', 'restaurant', 'dhaba', 'store', 'shop', 'se', 'from'];
    
    for (const item of this.FOOD_ITEMS) {
      if (lowerText.includes(item)) {
        found.push(item);
      }
    }

    // Also extract items after keywords
    const patterns = [
      /(?:order|chahiye|mangwao|lao|do|dena)\s+(.+?)(?:\s+(?:and|aur|,|please)|\s*$)/gi,
      /(?:want|need)\s+(?:a|some)?\s*(.+?)(?:\s+(?:and|,|please)|\s*$)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let item = match[1]?.trim();
        if (item && item.length > 2 && item.length < 50) {
          // Filter out restaurant-related extractions
          const hasRestaurantWord = restaurantWords.some(w => item.toLowerCase().includes(w));
          if (!hasRestaurantWord && !found.includes(item.toLowerCase())) {
            found.push(item.toLowerCase());
          }
        }
      }
    }

    return [...new Set(found)]; // Remove duplicates
  }

  /**
   * Extract restaurant name
   */
  private extractRestaurantName(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Pattern 1: Look for "NAME cafe/hotel/restaurant se" 
    // The NAME should be a single word NOT in our food list
    // e.g., "inayat cafe se" -> "inayat cafe"
    const venueTypes = ['cafe', 'hotel', 'restaurant', 'dhaba'];
    for (const venue of venueTypes) {
      const pattern = new RegExp(`(\\w+)\\s+${venue}\\s+se\\b`, 'i');
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Skip if name is a known food item or common word
        if (!this.FOOD_ITEMS.includes(name) && 
            !['mujhe', 'ghar', 'abhi', 'jaldi', 'aur', 'and'].includes(name) &&
            name.length > 2) {
          return `${name} ${venue}`;
        }
      }
    }
    
    // Pattern 2: "hotel/cafe NAME se" - venue type before name
    // e.g., "hotel taj se" -> "hotel taj"
    for (const venue of venueTypes) {
      const pattern = new RegExp(`${venue}\\s+(\\w+(?:\\s+\\w+)?)\\s+se\\b`, 'i');
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (!this.FOOD_ITEMS.includes(name.split(' ')[0])) {
          return `${venue} ${name}`;
        }
      }
    }

    // Pattern 3: "from NAME NAME" at end - multi-word restaurant name (case insensitive)
    // e.g., "from bhagat tarachand" or "from Bhagat Tarachand"
    const fromEndMatch = text.match(/from\s+([a-z]+(?:\s+[a-z]+)+)\s*$/i);
    if (fromEndMatch && fromEndMatch[1]) {
      const name = fromEndMatch[1].trim();
      // Make sure it's not common words
      if (!['my home', 'the shop', 'a restaurant'].includes(name.toLowerCase())) {
        return name;
      }
    }
    
    // Pattern 4: Capitalized proper noun "NAME se bhej/order" 
    const capitalMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+se\s+(?:bhej|order|manga)/);
    if (capitalMatch && capitalMatch[1]) {
      const name = capitalMatch[1].trim();
      if (!this.FOOD_ITEMS.includes(name.toLowerCase()) && name.length > 2) {
        return name;
      }
    }

    // Check for "Demo restaurant" pattern (test data)
    const demoMatch = text.match(/demo\s+restaurant/i);
    if (demoMatch) return 'Demo restaurant';

    return null;
  }

  /**
   * Extract quantity (numbers + units) including Hindi numbers
   */
  private extractQuantity(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // First check for Hindi number words
    for (const [word, num] of Object.entries(this.HINDI_NUMBERS)) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return String(num);
      }
    }

    const patterns = [
      /(\d+)\s*(?:plate|plates|piece|pieces|serving|servings|nos?|number)/i,
      /(\d+)\s*(?:kg|gram|gm|g|liter|litre|l|ml)/i,
      /(\d+)\s+(?:of|items?|qty)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    // Extract all numbers for multi-item orders
    const numbers = text.match(/\b(\d{1,3})\b/g);
    if (numbers && numbers.length > 0) {
      // Return first number if single, or comma-separated if multiple
      return numbers.length === 1 ? numbers[0] : numbers.join(',');
    }

    return null;
  }

  /**
   * Extract multiple quantities with their associated items
   * Returns structured cart data for complex orders
   */
  // Action words that should be removed from product names
  private readonly ACTION_WORDS = [
    'bhej', 'bhejo', 'manga', 'mangwao', 'lao', 'do', 'dena', 'order', 'karo', 'karwa',
    'chahiye', 'want', 'need', 'please', 'jaldi', 'abhi', 'from', 'se', 'pe', 'par',
    'ghar', 'home', 'office', 'aur', 'and', 'with', 'also',
  ];
  
  // Restaurant words to exclude from food items
  private readonly RESTAURANT_WORDS = ['hotel', 'cafe', 'restaurant', 'dhaba', 'store', 'shop'];
  
  extractCartItems(text: string): Array<{ product: string; quantity: number }> {
    const items: Array<{ product: string; quantity: number }> = [];
    const lowerText = text.toLowerCase();
    
    // Pattern: "X product" or "X product and Y product2"
    // e.g., "2 paneer tikka and 4 roti"
    const pattern = /(\d+|ek|do|teen|char|paanch|chhah|saat|aath|nau|das)\s+([a-z\s]+?)(?=(?:\s+and\s+|\s+aur\s+|,|$|\s+\d|\s+ek|\s+do|\s+from|\s+se\b))/gi;
    
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      const qtyStr = match[1];
      let product = match[2].trim();
      
      // Remove action words from product name
      for (const word of this.ACTION_WORDS) {
        product = product.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
      }
      // Clean up extra spaces
      product = product.replace(/\s+/g, ' ').trim();
      
      // Skip if product is now empty or too short
      if (product.length < 2) continue;
      
      // Skip if product looks like a restaurant name
      if (this.RESTAURANT_WORDS.some(w => product.includes(w))) continue;
      
      // Convert quantity
      let qty = parseInt(qtyStr);
      if (isNaN(qty)) {
        qty = this.HINDI_NUMBERS[qtyStr.toLowerCase()] || 1;
      }
      
      // Validate product is a food item (or just add if > 2 chars)
      if (this.FOOD_ITEMS.some(item => product.includes(item)) || product.length > 3) {
        items.push({ product, quantity: qty });
      }
    }
    
    return items;
  }

  /**
   * Extract urgency level
   */
  private extractUrgency(text: string): string | null {
    if (/jaldi|abhi|turant|urgent|asap|immediately|quick|fast/i.test(text)) {
      return 'urgent';
    }
    return null;
  }

  /**
   * Extract delivery location type
   */
  private extractDeliveryType(text: string): string | null {
    if (/ghar\s*(?:pe|par|me)|home|residence/i.test(text)) return 'home';
    if (/office|workplace|work/i.test(text)) return 'office';
    if (/hotel|hostel/i.test(text)) return 'hotel';
    return null;
  }

  private extractOrderId(text: string): string | null {
    // Match patterns like: ORD123, #12345, order 456, MNG-12345
    const patterns = [
      /(?:order|ord|#|mng[-_]?)\s*(\d{3,10})/i,
      /(?:booking|parcel)\s*(?:id|number|no\.?)?\s*(\d{3,10})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractPhoneNumber(text: string): string | null {
    // Indian phone numbers: 10 digits starting with 6-9
    const patterns = [
      /(?:\+91[\s-]?)?([6-9]\d{9})\b/,
      /(?:\+91[\s-]?)?(\d{10})\b/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractEmail(text: string): string | null {
    const match = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  }

  private extractLocation(text: string): string | null {
    // City names
    const cities = [
      'mumbai', 'delhi', 'bangalore', 'bengaluru', 'pune', 'hyderabad',
      'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'surat',
      'kanpur', 'nagpur', 'indore', 'bhopal', 'patna', 'vadodara',
      'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
      'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar',
    ];

    const lowerText = text.toLowerCase();
    
    // Check for cities
    const foundCity = cities.find((city) => lowerText.includes(city));
    if (foundCity) return foundCity;

    // Check for address patterns
    const addressPatterns = [
      /(?:near|opposite|beside|behind)\s+([A-Za-z\s]+?)(?:\s|,|$)/i,
      /(?:sector|block|lane|gali|street)\s*[-#]?\s*(\d+[A-Za-z]?)/i,
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }

    return null;
  }

  /**
   * Extract date references
   */
  private extractDate(text: string): string | null {
    const patterns = [
      /(?:today|aaj|abhi)/i,
      /(?:tomorrow|kal|kl)/i,
      /(?:yesterday|parso)/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{1,2})\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i,
      /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return null;
  }

  /**
   * Extract time references
   */
  private extractTime(text: string): string | null {
    const patterns = [
      /(\d{1,2})\s*(?::\s*\d{2})?\s*(?:am|pm|baje)/i,
      /(?:morning|evening|afternoon|night|subah|shaam|dopahar|raat)/i,
      /(?:in|after)\s+(\d+)\s*(?:hour|hr|minute|min)/i,
      /(?:jaldi|turant|asap|abhi)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return null;
  }

  /**
   * Extract price/money amounts
   */
  private extractPrice(text: string): string | null {
    const patterns = [
      /(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*)\s*(?:rupees?|rs|₹)/i,
      /(\d+)\s*(?:hundred|hazaar|thousand|lakh)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].trim();
    }
    return null;
  }

  /**
   * Extract person names (for parcel/delivery)
   */
  private extractPersonName(text: string): string | null {
    const patterns = [
      /(?:send to|deliver to|naam|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:recipient|receiver)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:mera naam|my name is)\s+([A-Z][a-z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common words
        if (!['the', 'a', 'my', 'your', 'me', 'please'].includes(name.toLowerCase())) {
          return name;
        }
      }
    }
    return null;
  }

  private extractProductName(text: string): string | null {
    // Extract text after "search", "find", "looking for"
    const patterns = [
      /(?:search|find|looking for|show me|dhundho|dikhao)\s+(.+)/i,
      /(?:want|chahiye|do)\s+(.+?)(?:\s+please)?$/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }
}
