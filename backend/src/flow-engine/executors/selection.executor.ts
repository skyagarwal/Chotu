import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

interface CardItem {
  id: number | string;
  name: string;
  price: string | number;
  storeId?: number;
  storeName?: string;
  storeLat?: number;
  storeLng?: number;
  [key: string]: any;
}

interface SelectionResult {
  selectedItems: Array<{
    itemIndex: number;
    itemId: number | string;
    itemName: string;
    quantity: number;
    price: number;
    storeId?: number;
    storeName?: string;
    storeLat?: number;
    storeLng?: number;
  }>;
  action: 'add_to_cart' | 'search_more' | 'checkout' | 'cancel' | 'search_items' | 'unknown';
  totalPrice: number;
  searchSuggestion?: string; // Items that weren't found - used to trigger re-search
}

/**
 * Selection Executor
 * 
 * Parses user selection from search results.
 * Handles formats:
 * - "Add X to cart" (from button click)
 * - "1" or "1,2,3" (item numbers)
 * - "1x2" (item 1, quantity 2)
 * - "first one" / "second item"
 * - "checkout" / "proceed"
 * - "cancel" / "no"
 */
@Injectable()
export class SelectionExecutor implements ActionExecutor {
  readonly name = 'selection';
  private readonly logger = new Logger(SelectionExecutor.name);

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const userMessage = (context.data._user_message || context.data.user_message) as string;
      const searchResults = context.data.search_results as { cards?: CardItem[]; items?: CardItem[] };
      
      if (!userMessage) {
        return {
          success: false,
          error: 'No user message to parse',
          event: 'error',
        };
      }

      const cards = searchResults?.cards || searchResults?.items || [];
      this.logger.debug(`Parsing selection from: "${userMessage}" with ${cards.length} items available`);

      const result = this.parseSelection(userMessage, cards);
      
      this.logger.log(`Selection result: action=${result.action}, items=${result.selectedItems.length}`);

      // Determine next event based on action
      let event = 'unknown';
      if (result.action === 'add_to_cart' && result.selectedItems.length > 0) {
        event = 'item_selected';
      } else if (result.action === 'checkout') {
        event = 'checkout';
      } else if (result.action === 'cancel') {
        event = 'cancel';
      } else if (result.action === 'search_more') {
        event = 'search_more';
      } else if (result.action === 'search_items') {
        // User requested specific items not in current results - trigger search for those
        event = 'search_items';
      } else {
        event = 'unclear';
      }

      return {
        success: true,
        output: result,
        event,
      };
    } catch (error) {
      this.logger.error(`Selection parsing failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  private parseSelection(message: string, cards: CardItem[]): SelectionResult {
    const lowerMessage = message.toLowerCase().trim();
    const result: SelectionResult = {
      selectedItems: [],
      action: 'unknown',
      totalPrice: 0,
    };

    // Check for "Add X to cart" format (from button clicks)
    const addToCartMatch = lowerMessage.match(/^add\s+(.+)\s+to\s+cart$/i);
    if (addToCartMatch) {
      const itemName = addToCartMatch[1].toLowerCase();
      const matchedItem = this.findItemByName(itemName, cards);
      if (matchedItem) {
        result.selectedItems.push(matchedItem);
        result.action = 'add_to_cart';
        result.totalPrice = matchedItem.price;
        return result;
      }
    }

    // Check for checkout intents
    if (this.isCheckoutIntent(lowerMessage)) {
      result.action = 'checkout';
      return result;
    }

    // Check for cancel intents
    if (this.isCancelIntent(lowerMessage)) {
      result.action = 'cancel';
      return result;
    }

    // Check for "search more" / "show more" intents
    if (this.isSearchMoreIntent(lowerMessage)) {
      result.action = 'search_more';
      return result;
    }

    // *** NEW: Parse multi-item natural language orders ***
    // "2 butter naan, one paneer tikka, one tandoori chicken"
    const multiItemResult = this.parseMultiItemNaturalLanguage(message, cards);
    if (multiItemResult.found.length > 0) {
      result.selectedItems = multiItemResult.found;
      result.action = 'add_to_cart';
      result.totalPrice = multiItemResult.found.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      // If some items weren't found, store them for potential re-search
      if (multiItemResult.notFound.length > 0) {
        result.searchSuggestion = multiItemResult.notFound.join(', ');
        this.logger.log(`Some requested items not found in current results: ${result.searchSuggestion}`);
      }
      return result;
    } else if (multiItemResult.notFound.length > 0) {
      // User requested specific items but NONE were found - trigger re-search
      result.action = 'search_items';
      result.searchSuggestion = multiItemResult.notFound.join(', ');
      this.logger.log(`Requested items not in results, suggest search: ${result.searchSuggestion}`);
      return result;
    }

    // Parse number-based selections: "1", "1,2,3", "1x2", "2 of first"
    const numberSelections = this.parseNumberSelections(lowerMessage, cards);
    if (numberSelections.length > 0) {
      result.selectedItems = numberSelections;
      result.action = 'add_to_cart';
      result.totalPrice = numberSelections.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return result;
    }

    // Parse ordinal selections: "first", "second", "last"
    const ordinalSelection = this.parseOrdinalSelection(lowerMessage, cards);
    if (ordinalSelection) {
      result.selectedItems.push(ordinalSelection);
      result.action = 'add_to_cart';
      result.totalPrice = ordinalSelection.price;
      return result;
    }

    // Try fuzzy name match as last resort
    const fuzzyMatch = this.fuzzyMatchItem(lowerMessage, cards);
    if (fuzzyMatch) {
      result.selectedItems.push(fuzzyMatch);
      result.action = 'add_to_cart';
      result.totalPrice = fuzzyMatch.price;
      return result;
    }

    return result;
  }

  private findItemByName(name: string, cards: CardItem[]): SelectionResult['selectedItems'][0] | null {
    const lowerName = name.toLowerCase();
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardName = (card.name || '').toLowerCase();
      
      if (cardName === lowerName || cardName.includes(lowerName) || lowerName.includes(cardName)) {
        return {
          itemIndex: i,
          itemId: card.id,
          itemName: card.name,
          quantity: 1,
          price: this.parsePrice(card.price),
          storeId: card.storeId,
          storeName: card.storeName,
          storeLat: card.storeLat,
          storeLng: card.storeLng,
        };
      }
    }
    
    return null;
  }

  private parseNumberSelections(message: string, cards: CardItem[]): SelectionResult['selectedItems'] {
    const selections: SelectionResult['selectedItems'] = [];
    
    // Match patterns: "1", "1,2,3", "1 2 3", "1x2", "1 x 2", "2 of 1"
    // Simple number: just "1" or "2"
    const simpleNumber = message.match(/^\d+$/);
    if (simpleNumber) {
      const index = parseInt(simpleNumber[0]) - 1; // Convert to 0-based
      if (index >= 0 && index < cards.length) {
        const card = cards[index];
        selections.push({
          itemIndex: index,
          itemId: card.id,
          itemName: card.name,
          quantity: 1,
          price: this.parsePrice(card.price),
          storeId: card.storeId,
          storeName: card.storeName,
          storeLat: card.storeLat,
          storeLng: card.storeLng,
        });
      }
      return selections;
    }

    // Multiple numbers: "1,2,3" or "1 2 3"
    const multipleNumbers = message.match(/(\d+)[,\s]+/g);
    if (multipleNumbers) {
      const numbers = message.match(/\d+/g);
      if (numbers) {
        for (const num of numbers) {
          const index = parseInt(num) - 1;
          if (index >= 0 && index < cards.length) {
            const card = cards[index];
            selections.push({
              itemIndex: index,
              itemId: card.id,
              itemName: card.name,
              quantity: 1,
              price: this.parsePrice(card.price),
              storeId: card.storeId,
              storeName: card.storeName,
              storeLat: card.storeLat,
              storeLng: card.storeLng,
            });
          }
        }
        return selections;
      }
    }

    // Quantity format: "1x2" or "1 x 2" (item 1, quantity 2)
    const quantityMatch = message.match(/(\d+)\s*[xX×]\s*(\d+)/);
    if (quantityMatch) {
      const index = parseInt(quantityMatch[1]) - 1;
      const quantity = parseInt(quantityMatch[2]);
      if (index >= 0 && index < cards.length && quantity > 0) {
        const card = cards[index];
        selections.push({
          itemIndex: index,
          itemId: card.id,
          itemName: card.name,
          quantity,
          price: this.parsePrice(card.price),
          storeId: card.storeId,
          storeName: card.storeName,
          storeLat: card.storeLat,
          storeLng: card.storeLng,
        });
      }
      return selections;
    }

    return selections;
  }

  private parseOrdinalSelection(message: string, cards: CardItem[]): SelectionResult['selectedItems'][0] | null {
    const ordinalMap: Record<string, number> = {
      'first': 0, 'second': 1, 'third': 2, 'fourth': 3, 'fifth': 4,
      'sixth': 5, 'seventh': 6, 'eighth': 7, 'ninth': 8, 'tenth': 9,
      'last': cards.length - 1,
      '1st': 0, '2nd': 1, '3rd': 2, '4th': 3, '5th': 4,
    };

    for (const [ordinal, index] of Object.entries(ordinalMap)) {
      if (message.includes(ordinal) && index >= 0 && index < cards.length) {
        const card = cards[index];
        return {
          itemIndex: index,
          itemId: card.id,
          itemName: card.name,
          quantity: 1,
          price: this.parsePrice(card.price),
          storeId: card.storeId,
          storeName: card.storeName,
          storeLat: card.storeLat,
          storeLng: card.storeLng,
        };
      }
    }

    return null;
  }

  private fuzzyMatchItem(message: string, cards: CardItem[]): SelectionResult['selectedItems'][0] | null {
    // Simple word overlap matching
    const words = message.split(/\s+/).filter(w => w.length > 2);
    
    let bestMatch: { index: number; score: number } | null = null;
    
    for (let i = 0; i < cards.length; i++) {
      const cardName = (cards[i].name || '').toLowerCase();
      const cardWords = cardName.split(/\s+/);
      
      let score = 0;
      for (const word of words) {
        if (cardWords.some(cw => cw.includes(word) || word.includes(cw))) {
          score++;
        }
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: i, score };
      }
    }

    if (bestMatch && bestMatch.score >= 1) {
      const card = cards[bestMatch.index];
      return {
        itemIndex: bestMatch.index,
        itemId: card.id,
        itemName: card.name,
        quantity: 1,
        price: this.parsePrice(card.price),
        storeId: card.storeId,
        storeName: card.storeName,
        storeLat: card.storeLat,
        storeLng: card.storeLng,
      };
    }

    return null;
  }

  private isCheckoutIntent(message: string): boolean {
    const checkoutKeywords = ['checkout', 'proceed', 'pay', 'order now', 'place order', 'confirm order', 'done', 'that\'s all', 'finish'];
    return checkoutKeywords.some(k => message.includes(k));
  }

  private isCancelIntent(message: string): boolean {
    const cancelKeywords = ['cancel', 'no thanks', 'never mind', 'nevermind', 'stop', 'exit', 'quit'];
    return cancelKeywords.some(k => message.includes(k));
  }

  private isSearchMoreIntent(message: string): boolean {
    const searchMoreKeywords = ['more', 'show more', 'other', 'different', 'something else', 'search again'];
    return searchMoreKeywords.some(k => message.includes(k));
  }

  /**
   * Parse multi-item natural language orders
   * Examples:
   * - "2 butter naan, one paneer tikka, one tandoori chicken"
   * - "I want 3 paneer tikka and 2 butter naan"
   * - "gimme two butter naan and a paneer"
   * 
   * Returns both found items and not-found item names for re-search
   */
  private parseMultiItemNaturalLanguage(message: string, cards: CardItem[]): {
    found: SelectionResult['selectedItems'];
    notFound: string[];
  } {
    const selections: SelectionResult['selectedItems'] = [];
    const notFoundItems: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Word to number mapping
    const wordToNumber: Record<string, number> = {
      'a': 1, 'an': 1, 'one': 1, 'ek': 1,
      'two': 2, 'do': 2, 'double': 2,
      'three': 3, 'teen': 3, 'triple': 3,
      'four': 4, 'char': 4,
      'five': 5, 'panch': 5,
      'six': 6, 'cheh': 6,
      'seven': 7, 'saat': 7,
      'eight': 8, 'aath': 8,
      'nine': 9, 'nau': 9,
      'ten': 10, 'das': 10,
    };
    
    // Split by common separators: comma, "and", "aur", "&"
    const segments = lowerMessage.split(/[,&]|\s+and\s+|\s+aur\s+/);
    
    // If fewer than 2 segments with quantity patterns, this may not be a multi-item request
    const itemPatterns = segments.filter(seg => {
      const trimmed = seg.trim();
      return trimmed && (
        /^\d+\s+\w/.test(trimmed) || // starts with number
        Object.keys(wordToNumber).some(w => trimmed.startsWith(w + ' '))
      );
    });
    
    if (itemPatterns.length === 0 && segments.length < 2) {
      // Doesn't look like a multi-item request
      return { found: [], notFound: [] };
    }
    
    for (const segment of segments) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment || trimmedSegment.length < 3) continue;
      
      // Skip common filler words
      if (/^(i want|gimme|give me|please|can i have|i need|order|get|i'll have|i would like)$/i.test(trimmedSegment)) continue;
      
      // Try to extract quantity and item name
      // Pattern: "[quantity] [item name]" or "[item name] x [quantity]"
      let quantity = 1;
      let itemPart = trimmedSegment;
      
      // Check for leading number: "2 butter naan"
      const leadingNumberMatch = trimmedSegment.match(/^(\d+)\s+(.+)/);
      if (leadingNumberMatch) {
        quantity = parseInt(leadingNumberMatch[1]);
        itemPart = leadingNumberMatch[2];
      } else {
        // Check for leading word number: "two butter naan", "one paneer tikka"
        const words = trimmedSegment.split(/\s+/);
        if (words.length > 1 && wordToNumber[words[0]]) {
          quantity = wordToNumber[words[0]];
          itemPart = words.slice(1).join(' ');
        }
      }
      
      // Check for trailing quantity: "butter naan x2"
      const trailingQuantityMatch = itemPart.match(/(.+?)\s*[xX×]\s*(\d+)$/);
      if (trailingQuantityMatch) {
        itemPart = trailingQuantityMatch[1].trim();
        quantity = parseInt(trailingQuantityMatch[2]);
      }
      
      // Skip if item part is too short
      if (itemPart.length < 3) continue;
      
      // Try to match item name against available cards
      const matchedItem = this.findBestMatchForItemName(itemPart, cards);
      if (matchedItem) {
        // Check if we already have this item, if so, update quantity
        const existingIndex = selections.findIndex(s => s.itemId === matchedItem.itemId);
        if (existingIndex >= 0) {
          selections[existingIndex].quantity += quantity;
        } else {
          selections.push({
            ...matchedItem,
            quantity,
          });
        }
      } else {
        // Item not found in current search results
        notFoundItems.push(itemPart);
      }
    }
    
    this.logger.debug(`Multi-item parse found ${selections.length} items: ${selections.map(s => `${s.quantity}x ${s.itemName}`).join(', ')}`);
    if (notFoundItems.length > 0) {
      this.logger.debug(`Items not found: ${notFoundItems.join(', ')}`);
    }
    
    return { found: selections, notFound: notFoundItems };
  }

  /**
   * Find best matching card for an item name using fuzzy matching
   */
  private findBestMatchForItemName(itemName: string, cards: CardItem[]): SelectionResult['selectedItems'][0] | null {
    const lowerItemName = itemName.toLowerCase().trim();
    const itemWords = lowerItemName.split(/\s+/).filter(w => w.length > 1);
    
    let bestMatch: { index: number; score: number; card: CardItem } | null = null;
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardName = (card.name || '').toLowerCase();
      const cardWords = cardName.split(/\s+/);
      
      // Calculate match score
      let score = 0;
      
      // Exact match
      if (cardName === lowerItemName) {
        score = 100;
      } else if (cardName.includes(lowerItemName) || lowerItemName.includes(cardName)) {
        // Substring match
        score = 50;
      } else {
        // Word overlap
        for (const word of itemWords) {
          if (cardWords.some(cw => cw.includes(word) || word.includes(cw))) {
            score += 10;
          }
        }
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: i, score, card };
      }
    }
    
    if (bestMatch && bestMatch.score >= 10) {
      return {
        itemIndex: bestMatch.index,
        itemId: bestMatch.card.id,
        itemName: bestMatch.card.name,
        quantity: 1,
        price: this.parsePrice(bestMatch.card.price),
        storeId: bestMatch.card.storeId,
        storeName: bestMatch.card.storeName,
        storeLat: bestMatch.card.storeLat,
        storeLng: bestMatch.card.storeLng,
      };
    }
    
    return null;
  }

  private parsePrice(price: string | number): number {
    if (typeof price === 'number') return price;
    // Parse "₹310" or "Rs. 310" or just "310"
    const match = String(price).match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return 0;
  }
}
