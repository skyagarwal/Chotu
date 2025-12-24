import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

interface ExtractedItem {
  name: string;
  quantity: number;
}

interface CardItem {
  id: number | string;
  name: string;
  price: string | number;
  rawPrice?: number;
  storeId?: number;
  moduleId?: number;
  storeName?: string;
  storeLat?: number;
  storeLng?: number;
  [key: string]: any;
}

interface MatchedItem {
  itemIndex: number;
  itemId: number | string;
  itemName: string;
  quantity: number;
  price: number;
  rawPrice?: number;
  storeId?: number;
  moduleId?: number;
  storeName?: string;
  storeLat?: number;
  storeLng?: number;
  extractedName: string;  // What user asked for
  matchScore: number;
}

/**
 * Auto Cart Executor
 * 
 * Automatically matches extracted items with quantities against search results
 * and builds a cart. This handles cases like "I want 2 pizzas and 3 burgers"
 * where we extract items+quantities first and then match them to real products.
 */
@Injectable()
export class AutoCartExecutor implements ActionExecutor {
  readonly name = 'auto_cart';
  private readonly logger = new Logger(AutoCartExecutor.name);

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const extractedItemsPath = config.extractedItemsPath || 'extracted_food.items';
      const searchResultsPath = config.searchResultsPath || 'search_results.cards';

      // Get extracted items from context
      const extractedItems = this.getNestedValue(context.data, extractedItemsPath) as ExtractedItem[];
      const searchResults = this.getNestedValue(context.data, searchResultsPath) as CardItem[];

      if (!extractedItems || !Array.isArray(extractedItems) || extractedItems.length === 0) {
        return {
          success: false,
          error: 'No extracted items found',
          event: 'no_match',
        };
      }

      if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
        return {
          success: false,
          error: 'No search results to match against',
          event: 'no_match',
        };
      }

      this.logger.log(`🛒 Auto-cart: Matching ${extractedItems.length} extracted items against ${searchResults.length} search results`);

      // Match each extracted item to search results
      const matchedItems: MatchedItem[] = [];
      const unmatchedItems: string[] = [];
      let totalPrice = 0;

      for (const extracted of extractedItems) {
        const match = this.findBestMatch(extracted.name, searchResults);
        
        if (match) {
          const quantity = extracted.quantity || 1;
          const price = this.parsePrice(match.card.price);
          const itemTotal = price * quantity;
          
          matchedItems.push({
            itemIndex: match.index,
            itemId: match.card.id,
            itemName: match.card.name,
            quantity,
            price,
            rawPrice: match.card.rawPrice,
            storeId: match.card.storeId,
            moduleId: match.card.moduleId,
            storeName: match.card.storeName,
            storeLat: match.card.storeLat,
            storeLng: match.card.storeLng,
            extractedName: extracted.name,
            matchScore: match.score,
          });
          
          totalPrice += itemTotal;
          this.logger.debug(`✅ Matched "${extracted.name}" (x${quantity}) → "${match.card.name}" @ ₹${price}`);
        } else {
          unmatchedItems.push(extracted.name);
          this.logger.debug(`❌ No match found for "${extracted.name}"`);
        }
      }

      // Build result message
      const message = this.buildCartMessage(matchedItems, unmatchedItems, totalPrice);

      // Determine event
      let event = 'no_match';
      if (matchedItems.length === extractedItems.length) {
        event = 'all_matched';
      } else if (matchedItems.length > 0) {
        event = 'partial_match';
      }

      return {
        success: matchedItems.length > 0,
        output: {
          selectedItems: matchedItems,
          unmatchedItems,
          totalPrice,
          message,
          allMatched: matchedItems.length === extractedItems.length,
        },
        event,
      };
    } catch (error) {
      this.logger.error(`Auto-cart failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  /**
   * Find best matching card for an extracted item name
   */
  private findBestMatch(itemName: string, cards: CardItem[]): { card: CardItem; index: number; score: number } | null {
    const lowerItemName = itemName.toLowerCase().trim();
    const itemWords = lowerItemName.split(/\s+/).filter(w => w.length > 1);
    
    let bestMatch: { card: CardItem; index: number; score: number } | null = null;
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardName = (card.name || '').toLowerCase();
      const cardWords = cardName.split(/\s+/);
      
      let score = 0;
      
      // Exact match - highest score
      if (cardName === lowerItemName) {
        score = 100;
      } 
      // Card name contains item name
      else if (cardName.includes(lowerItemName)) {
        score = 80;
      }
      // Item name contains card name
      else if (lowerItemName.includes(cardName)) {
        score = 60;
      }
      // Word overlap
      else {
        for (const word of itemWords) {
          if (cardWords.some(cw => cw.includes(word) || word.includes(cw))) {
            score += 15;
          }
        }
        // Bonus for matching key words
        const keyWords = ['pizza', 'burger', 'biryani', 'naan', 'tikka', 'paneer', 'chicken', 'roti', 'dal', 'rice', 'momos'];
        for (const key of keyWords) {
          if (lowerItemName.includes(key) && cardName.includes(key)) {
            score += 20;
          }
        }
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { card, index: i, score };
      }
    }
    
    // Require minimum score to consider it a match
    if (bestMatch && bestMatch.score >= 20) {
      return bestMatch;
    }
    
    return null;
  }

  /**
   * Build user-friendly cart message
   */
  private buildCartMessage(
    matchedItems: MatchedItem[],
    unmatchedItems: string[],
    totalPrice: number
  ): string {
    if (matchedItems.length === 0) {
      return "Sorry, I couldn't find exact matches for your items. Please select from the options below.";
    }

    const lines: string[] = ['🛒 **Your Cart**\n'];
    
    for (const item of matchedItems) {
      lines.push(`${item.quantity}x ${item.itemName} - ₹${(item.price * item.quantity).toFixed(0)}`);
    }
    
    lines.push(`\n**Total: ₹${totalPrice.toFixed(0)}**`);
    
    if (unmatchedItems.length > 0) {
      lines.push(`\n⚠️ Couldn't find: ${unmatchedItems.join(', ')}`);
      lines.push('You can add them manually or search for alternatives.');
    }
    
    lines.push('\nShall I proceed to checkout?');
    
    return lines.join('\n');
  }

  /**
   * Parse price from string or number
   */
  private parsePrice(price: string | number): number {
    if (typeof price === 'number') return price;
    const match = String(price).match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return 0;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  validate(config: Record<string, any>): boolean {
    return true; // No required config
  }
}
