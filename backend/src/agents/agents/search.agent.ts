import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../services/base-agent.service';
import { AgentContext, AgentConfig, AgentType, FunctionDefinition, ModuleType } from '../types/agent.types';

/**
 * Search Agent
 * 
 * Handles product/restaurant/service searches across all modules
 */
@Injectable()
export class SearchAgent extends BaseAgent {
  getConfig(): AgentConfig {
    return {
      id: 'search-agent',
      type: AgentType.SEARCH,
      name: 'Search Agent',
      description: 'Handles search queries for products, restaurants, and services',
      modules: [
        ModuleType.FOOD,
        ModuleType.ECOM,
        ModuleType.PARCEL,
        ModuleType.GROCERY,
        ModuleType.PHARMACY,
      ],
      systemPrompt: '', // Set dynamically
      temperature: 0.5,
      maxTokens: 1500,
      functions: this.getFunctions(),
      enabled: true,
    };
  }

  getSystemPrompt(context: AgentContext): string {
    const { getPersonalityPrompt } = require('../config/personality.config');
    
    // Use module-specific personality (with Nashik local touch)
    const basePrompt = getPersonalityPrompt(context.module);
    
    // Add dynamic context
    const contextInfo = context.session?.location 
      ? `\n\nUSER LOCATION: ${context.session.location}` 
      : '';
    
    const sessionInfo = context.session?.authenticated
      ? '\n\nUSER STATUS: Authenticated (can place orders)'
      : '\n\nUSER STATUS: Guest (can browse only - ask to login for orders)';
    
    return basePrompt + contextInfo + sessionInfo + `

SEARCH CAPABILITIES:
When users search for food/products:
1. Use natural language (they might say "kuch meetha", "spicy noodles", "under 200")
2. Extract filters smartly:
   - Price: "under 300" → price_max: 300
   - Dietary: "veg pizza" → veg: true
   - Category: "chinese food" → category: "chinese"
3. Show relevant results with prices
4. If not authenticated and they want to order, say: "Order karne ke liye quick login karo - phone number?"`;
  }

  getFunctions(): FunctionDefinition[] {
    return [
      {
        name: 'search_products',
        description:
          'Search for products, restaurants, or services. ALWAYS extract price limits and dietary preferences as separate parameters. Use semantic search for natural language queries.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords ONLY - item name, cuisine, category (e.g., "pizza", "milk", "laptop"). Do NOT include price or veg/non-veg in query.',
            },
            veg: {
              type: 'boolean',
              description: 'Set to true for vegetarian items only. Extract from queries like "veg pizza", "vegetarian food", "pure veg". If not specified, return both.',
            },
            price_min: {
              type: 'number',
              description: 'Minimum price in rupees. Extract from queries like "above 100", "more than 50", "at least 200".',
            },
            price_max: {
              type: 'number',
              description: 'Maximum price in rupees. ALWAYS extract from queries like "under 300", "below 500", "within 200", "less than 100".',
            },
            category: {
              type: 'string',
              description: 'Category filter (e.g., "electronics", "groceries", "chinese", "indian")',
            },
            module: {
              type: 'string',
              description: 'Target module/store type (e.g., "food", "ecom", "pharmacy"). Use "ecom" for "shopping", "dukan", "shop", "grocery", "store", "kirana". Use "food" for "restaurant", "cafe", "pizza", "burger", "thali".',
            },
            semantic: {
              type: 'boolean',
              description: 'Use AI/semantic search for natural language queries like "healthy breakfast", "spicy snacks", "something sweet". Default: true for descriptive queries, false for specific item names.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_restaurant_menu',
        description: 'Get full menu of a specific restaurant',
        parameters: {
          type: 'object',
          properties: {
            restaurant_id: {
              type: 'string',
              description: 'Restaurant ID',
            },
          },
          required: ['restaurant_id'],
        },
      },
    ];
  }
}
