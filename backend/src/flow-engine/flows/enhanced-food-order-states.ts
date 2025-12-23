/**
 * Enhanced Food Order Flow States
 * 
 * Additional states for handling:
 * - Group orders
 * - Complex budget constraints
 * - Time-constrained orders
 * - Restaurant-specific orders
 * - Value proposition display
 * 
 * These states should be merged into food-order.flow.ts
 */

import { FlowState } from '../types/flow.types';

export const enhancedFoodOrderStates: Record<string, FlowState> = {
  
  // ==================== GROUP ORDER STATES ====================
  
  /**
   * Parse complex order request (group, budget, time constrained)
   */
  parse_complex_order: {
    type: 'action',
    description: 'Parse complex order like "3 people, hungry, under 1000"',
    actions: [
      {
        id: 'parse_complex',
        executor: 'complex_order_parser',
        config: {},
        output: 'group_context',
      },
    ],
    transitions: {
      group_order: 'validate_group_order',
      specific_restaurant: 'search_specific_restaurant',
      budget_order: 'search_budget_options',
      time_constrained: 'search_quick_delivery',
      needs_clarification: 'clarify_order_details',
      regular_order: 'search_food',  // Fall back to normal search
      error: 'understand_request',
    },
  },

  /**
   * Validate group order has all required info
   */
  validate_group_order: {
    type: 'decision',
    description: 'Check if group order has all needed details',
    conditions: [
      {
        expression: 'context.group_context?.groupSize && context.group_context?.budget?.amount',
        event: 'complete',
      },
      {
        expression: 'context.group_context?.groupSize && !context.group_context?.budget',
        event: 'needs_budget',
      },
      {
        expression: '!context.group_context?.groupSize',
        event: 'needs_group_size',
      },
    ],
    transitions: {
      complete: 'build_group_order',
      needs_budget: 'ask_group_budget',
      needs_group_size: 'ask_group_size',
      default: 'clarify_order_details',
    },
  },

  /**
   * Ask for group size
   */
  ask_group_size: {
    type: 'wait',
    description: 'Ask how many people are ordering',
    actions: [
      {
        id: 'ask_size',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Ask in a friendly way how many people will be eating. Be brief.',
          prompt: 'User wants group order but didn\'t say how many people. Ask casually in Hinglish.',
          temperature: 0.7,
          maxTokens: 60,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'update_group_size',
    },
  },

  /**
   * Update group size from user response
   */
  update_group_size: {
    type: 'action',
    description: 'Extract group size from user response',
    actions: [
      {
        id: 'extract_size',
        executor: 'llm',
        config: {
          systemPrompt: 'Extract the number of people from the message. Return only a JSON object.',
          prompt: 'User message: "{{user_message}}"\n\nReturn: {"group_size": <number or null>}',
          temperature: 0.1,
          maxTokens: 30,
          parseJson: true,
        },
        output: '_extracted_size',
      },
      {
        id: 'save_size',
        executor: 'response',
        config: {
          saveToContext: {
            'group_context.groupSize': '{{_extracted_size.group_size}}',
          },
        },
      },
    ],
    transitions: {
      success: 'validate_group_order',
    },
  },

  /**
   * Ask for budget
   */
  ask_group_budget: {
    type: 'wait',
    description: 'Ask for budget for group order',
    actions: [
      {
        id: 'ask_budget',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Ask for budget in a friendly way. Be brief.',
          prompt: '{{group_context.groupSize}} log hain. Unka total budget kya hai? Ask casually.',
          temperature: 0.7,
          maxTokens: 60,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'update_group_budget',
    },
  },

  /**
   * Update budget from user response
   */
  update_group_budget: {
    type: 'action',
    description: 'Extract budget from user response',
    actions: [
      {
        id: 'extract_budget',
        executor: 'llm',
        config: {
          systemPrompt: 'Extract the budget amount from the message. Return only a JSON object.',
          prompt: 'User message: "{{user_message}}"\n\nReturn: {"budget": <number or null>, "type": "total" or "per_person"}',
          temperature: 0.1,
          maxTokens: 50,
          parseJson: true,
        },
        output: '_extracted_budget',
      },
      {
        id: 'save_budget',
        executor: 'response',
        config: {
          saveToContext: {
            'group_context.budget': {
              'amount': '{{_extracted_budget.budget}}',
              'type': '{{_extracted_budget.type}}',
            },
          },
        },
      },
    ],
    transitions: {
      success: 'validate_group_order',
    },
  },

  /**
   * Build optimal group order
   */
  build_group_order: {
    type: 'action',
    description: 'Find optimal items for the group',
    actions: [
      {
        id: 'search_group',
        executor: 'group_order_search',
        config: {
          parsedOrderPath: 'group_context',
          requirementsPath: 'group_context.requirements',
        },
        output: 'group_recommendations',
      },
    ],
    transitions: {
      found: 'show_group_recommendations',
      no_match: 'no_group_results',
      error: 'no_group_results',
    },
  },

  /**
   * Show group order recommendations
   */
  show_group_recommendations: {
    type: 'wait',
    description: 'Display optimized group order options',
    actions: [
      {
        id: 'display_group',
        executor: 'response',
        config: {
          message: '{{group_recommendations.chatMessage}}',
          dynamicMetadata: {
            cards: 'group_recommendations.cards',
            orderType: 'group',
            groupSize: '{{group_context.groupSize}}',
            budget: '{{group_context.budget.amount}}',
          },
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'handle_group_selection',
      select_group_order: 'confirm_group_order',
    },
  },

  /**
   * Handle user response to group recommendations
   */
  handle_group_selection: {
    type: 'action',
    description: 'Parse user selection or modification request',
    actions: [
      {
        id: 'parse_response',
        executor: 'llm',
        config: {
          systemPrompt: 'Determine if user wants to: order (confirms), modify (change items/budget), different (try another restaurant), or cancel.',
          prompt: 'User said: "{{user_message}}"\n\nReturn: {"action": "order"|"modify"|"different"|"cancel"|"unclear", "details": "any specific request"}',
          temperature: 0.1,
          maxTokens: 60,
          parseJson: true,
        },
        output: '_group_action',
      },
    ],
    transitions: {
      success: 'route_group_action',
    },
  },

  /**
   * Route based on user's group order action
   */
  route_group_action: {
    type: 'decision',
    description: 'Route to appropriate next step',
    conditions: [
      {
        expression: 'context._group_action?.action === "order"',
        event: 'confirm',
      },
      {
        expression: 'context._group_action?.action === "modify"',
        event: 'modify',
      },
      {
        expression: 'context._group_action?.action === "different"',
        event: 'different',
      },
      {
        expression: 'context._group_action?.action === "cancel"',
        event: 'cancel',
      },
    ],
    transitions: {
      confirm: 'confirm_group_order',
      modify: 'modify_group_order',
      different: 'build_group_order',  // Retry with different restaurant
      cancel: 'cancelled',
      default: 'show_group_recommendations',  // Ask again
    },
  },

  /**
   * Confirm group order
   */
  confirm_group_order: {
    type: 'action',
    description: 'Confirm and prepare group order for checkout',
    actions: [
      {
        id: 'set_selected_items',
        executor: 'response',
        config: {
          saveToContext: {
            'selected_items': '{{group_recommendations.topRecommendation.items}}',
            'is_group_order': true,
            'group_size': '{{group_context.groupSize}}',
          },
        },
      },
    ],
    transitions: {
      success: 'check_auth_for_checkout',  // Continue to normal checkout
    },
  },

  /**
   * Modify group order
   */
  modify_group_order: {
    type: 'wait',
    description: 'Allow user to modify group order',
    actions: [
      {
        id: 'ask_modification',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Ask what they want to change in a friendly way.',
          prompt: 'User wants to modify the order. Ask: "Kya change karna hai? Budget, items, ya restaurant?"',
          temperature: 0.7,
          maxTokens: 60,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'parse_complex_order',  // Re-parse with modifications
    },
  },

  /**
   * No results for group order
   */
  no_group_results: {
    type: 'wait',
    description: 'No matching restaurants for group requirements',
    actions: [
      {
        id: 'no_results_msg',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Apologize and suggest alternatives.',
          prompt: `No restaurants found for {{group_context.groupSize}} people under ₹{{group_context.budget.amount}}.
Suggest either:
1. Increasing budget
2. Reducing group size
3. Trying different cuisines
Be helpful and brief.`,
          temperature: 0.7,
          maxTokens: 100,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'parse_complex_order',
    },
  },

  // ==================== CLARIFICATION STATES ====================

  /**
   * Clarify order details
   */
  clarify_order_details: {
    type: 'wait',
    description: 'Ask for missing order details',
    actions: [
      {
        id: 'ask_clarification',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Ask ONE clarifying question based on what\'s missing.',
          prompt: `Order context: {{group_context}}
Missing info: {{group_context.clarificationQuestions}}

Ask the FIRST missing question in a friendly Hinglish way.`,
          temperature: 0.7,
          maxTokens: 80,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'parse_complex_order',  // Re-parse with new info
    },
  },

  // ==================== SPECIFIC RESTAURANT STATES ====================

  /**
   * Search for specific restaurant mentioned by user
   */
  search_specific_restaurant: {
    type: 'action',
    description: 'Search for items from specific restaurant',
    actions: [
      {
        id: 'search_restaurant',
        executor: 'search',
        config: {
          index: 'food_items',
          query: '{{group_context.restaurant.name}}',
          size: 20,
          filters: [
            { field: 'restaurant_name', operator: 'contains', value: '{{group_context.restaurant.name}}' },
          ],
          formatForUi: true,
        },
        output: 'restaurant_items',
      },
    ],
    transitions: {
      items_found: 'show_restaurant_items',
      no_items: 'search_external_for_restaurant',
      error: 'search_external_for_restaurant',
    },
  },

  /**
   * Search external (Google Places) for restaurant not in our DB
   */
  search_external_for_restaurant: {
    type: 'action',
    description: 'Search Google Places for the requested restaurant',
    actions: [
      {
        id: 'external_search',
        executor: 'external_search',
        config: {
          query: '{{group_context.restaurant.name}}',
          location: '{{location.city || "Nashik"}}',
          type: 'restaurant',
          radius: 25000,
          lat: '{{location.lat}}',
          lng: '{{location.lng}}',
        },
        output: 'external_search_results',
      },
    ],
    transitions: {
      found: 'show_external_results',
      not_found: 'restaurant_not_found',
      error: 'restaurant_not_found',
    },
  },

  /**
   * Show items from specific restaurant
   */
  show_restaurant_items: {
    type: 'wait',
    description: 'Display items from requested restaurant',
    actions: [
      {
        id: 'display_restaurant',
        executor: 'response',
        config: {
          message: '🏪 {{group_context.restaurant.name}} se yeh items available hain! Kya mangana hai?',
          dynamicMetadata: {
            cards: 'restaurant_items.cards',
          },
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'process_selection',  // Normal selection flow
    },
  },

  /**
   * Restaurant not found
   */
  restaurant_not_found: {
    type: 'wait',
    description: 'Restaurant not found in our network',
    actions: [
      {
        id: 'not_found_msg',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Restaurant not found. Offer alternatives.',
          prompt: `User wanted "{{group_context.restaurant.name}}" but it's not in our network.
Apologize and offer to:
1. Search for similar restaurants
2. Try a different name/spelling
3. Show popular options in the area
Be helpful!`,
          temperature: 0.7,
          maxTokens: 100,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'understand_request',
    },
  },

  // ==================== TIME-CONSTRAINED STATES ====================

  /**
   * Search for quick delivery options
   */
  search_quick_delivery: {
    type: 'action',
    description: 'Find restaurants with fast delivery',
    actions: [
      {
        id: 'quick_search',
        executor: 'search',
        config: {
          index: 'food_items',
          query: '{{group_context.specificItems || "popular food"}}',
          size: 15,
          sortBy: 'delivery_time',
          formatForUi: true,
          lat: '{{location.lat}}',
          lng: '{{location.lng}}',
        },
        output: 'quick_results',
      },
    ],
    transitions: {
      items_found: 'filter_by_time',
      no_items: 'no_quick_options',
    },
  },

  /**
   * Filter results by delivery time constraint
   */
  filter_by_time: {
    type: 'action',
    description: 'Filter results by max delivery time',
    actions: [
      {
        id: 'time_filter',
        executor: 'llm',
        config: {
          systemPrompt: 'Filter the results to only include items that can be delivered within the time limit.',
          prompt: `Max delivery time: {{group_context.timeConstraint.minutes}} mins
Results: {{quick_results.cards}}

Return items that can be delivered in time. Format as array of item IDs.`,
          temperature: 0.1,
          maxTokens: 200,
        },
        output: '_filtered_items',
      },
    ],
    transitions: {
      success: 'show_quick_options',
    },
  },

  /**
   * Show quick delivery options
   */
  show_quick_options: {
    type: 'wait',
    description: 'Display fast delivery options',
    actions: [
      {
        id: 'show_quick',
        executor: 'response',
        config: {
          message: '⚡ {{group_context.timeConstraint.minutes}} mins mein yeh pahunch sakte hain!',
          dynamicMetadata: {
            cards: 'quick_results.cards',
            timeConstraint: '{{group_context.timeConstraint.minutes}}',
          },
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'process_selection',
    },
  },

  /**
   * No quick options available
   */
  no_quick_options: {
    type: 'wait',
    description: 'No fast delivery options found',
    actions: [
      {
        id: 'no_quick_msg',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. No quick delivery options. Suggest alternatives.',
          prompt: `User wanted delivery in {{group_context.timeConstraint.minutes}} mins but nothing available that fast.
Suggest options with slightly longer delivery time, or ask if they can wait a bit longer.`,
          temperature: 0.7,
          maxTokens: 100,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'understand_request',
    },
  },

  // ==================== BUDGET-FOCUSED STATES ====================

  /**
   * Search within budget constraints
   */
  search_budget_options: {
    type: 'action',
    description: 'Find items within budget',
    actions: [
      {
        id: 'budget_search',
        executor: 'search',
        config: {
          index: 'food_items',
          query: '{{group_context.specificItems || group_context.cuisines || "popular"}}',
          size: 15,
          filters: [
            { field: 'mrp', operator: 'lt', value: '{{group_context.budget.amount}}' },
          ],
          sortBy: 'value',  // Best value first
          formatForUi: true,
        },
        output: 'budget_results',
      },
    ],
    transitions: {
      items_found: 'show_budget_options',
      no_items: 'no_budget_options',
    },
  },

  /**
   * Show budget-friendly options
   */
  show_budget_options: {
    type: 'wait',
    description: 'Display budget-friendly options',
    actions: [
      {
        id: 'show_budget',
        executor: 'response',
        config: {
          message: '💰 ₹{{group_context.budget.amount}} mein yeh options hain! Best value items:',
          dynamicMetadata: {
            cards: 'budget_results.cards',
            budget: '{{group_context.budget.amount}}',
          },
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'process_selection',
    },
  },

  /**
   * No budget options available
   */
  no_budget_options: {
    type: 'wait',
    description: 'No items within budget',
    actions: [
      {
        id: 'no_budget_msg',
        executor: 'llm',
        config: {
          systemPrompt: 'You are Chotu. Nothing in budget. Be helpful.',
          prompt: `User budget: ₹{{group_context.budget.amount}}
Nothing found in this budget. Suggest:
1. Slightly increasing budget
2. Looking at different categories
3. Checking deals and offers
Be empathetic!`,
          temperature: 0.7,
          maxTokens: 100,
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'understand_request',
    },
  },

  // ==================== VALUE PROPOSITION STATES ====================

  /**
   * Calculate and show value proposition
   */
  show_value_proposition: {
    type: 'action',
    description: 'Show why Mangwale pricing is better',
    actions: [
      {
        id: 'calculate_value',
        executor: 'value_proposition',
        config: {
          itemTotalPath: 'pricing.itemsTotal',
          distancePath: 'distance',
          itemCountPath: 'selected_items.length',
        },
        output: 'value_comparison',
      },
    ],
    transitions: {
      success: 'display_value_if_significant',
    },
  },

  /**
   * Display value proposition if savings are significant
   */
  display_value_if_significant: {
    type: 'decision',
    description: 'Show savings message only if significant',
    conditions: [
      {
        expression: 'context.value_comparison?.savings >= 30',
        event: 'show_savings',
      },
    ],
    transitions: {
      show_savings: 'display_savings_message',
      default: 'show_order_summary',  // Skip if savings too small
    },
  },

  /**
   * Display savings message
   */
  display_savings_message: {
    type: 'action',
    description: 'Show savings compared to other apps',
    actions: [
      {
        id: 'savings_msg',
        executor: 'response',
        config: {
          message: '{{value_comparison.displayMessageHindi}}',
        },
      },
    ],
    transitions: {
      success: 'show_order_summary',
    },
  },

  // ==================== WHY MANGWALE STATE ====================

  /**
   * Answer "Why Mangwale?" questions
   */
  explain_why_mangwale: {
    type: 'action',
    description: 'Explain Mangwale benefits',
    actions: [
      {
        id: 'why_mangwale',
        executor: 'why_mangwale',
        config: {},
        output: 'why_response',
      },
      {
        id: 'display_why',
        executor: 'response',
        config: {
          message: '{{why_response.response}}',
        },
        output: '_last_response',
      },
    ],
    transitions: {
      user_message: 'understand_request',
    },
  },
};

export default enhancedFoodOrderStates;
