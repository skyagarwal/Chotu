import { FlowDefinition } from '../types/flow.types';

export const ecommerceOrderFlow: FlowDefinition = {
  id: 'ecommerce_order_v1',
  name: 'E-commerce Order Flow',
  description: 'Complete e-commerce shopping flow with search, cart, address, and payment',
  module: 'ecommerce',
  trigger: 'search_product',
  version: '1.0.0',
  
  contextSchema: {
    search_query: { type: 'string', required: false },
    search_results: { type: 'array', required: false },
    cart_items: { type: 'array', required: true },
    delivery_address: { type: 'object', required: true },
    distance: { type: 'number', required: false },
    pricing: { type: 'object', required: true },
    order_result: { type: 'object', required: false },
  },
  
  states: {
    // Check trigger
    check_trigger: {
      type: 'decision',
      description: 'Check if user already specified a product',
      conditions: [
        {
          expression: 'context._user_message && context._user_message.length > 3 && !["hi", "hello", "shop"].includes(context._user_message.toLowerCase())',
          event: 'has_query',
        }
      ],
      transitions: {
        has_query: 'understand_request',
        default: 'init',
      },
    },

    // Initial state
    init: {
      type: 'action',
      description: 'Welcome and ask what user wants to shop for',
      actions: [
        {
          id: 'welcome_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are Mangwale Mart Assistant. Be concise.',
            prompt: 'Greet user. Ask "What would you like to buy today? We have groceries, electronics, and more."',
            temperature: 0.6,
            maxTokens: 60,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'understand_request',
      },
    },

    // Extract shopping intent
    understand_request: {
      type: 'action',
      description: 'Understand what user wants to buy',
      actions: [
        {
          id: 'analyze_request',
          executor: 'nlu',
          config: {
            extractEntities: true,
          },
          output: 'shopping_nlu',
        },
      ],
      transitions: {
        success: 'search_products',
      },
    },

    // Search products
    search_products: {
      type: 'action',
      description: 'Search e-commerce products',
      actions: [
        {
          id: 'search_items',
          executor: 'search',
          config: {
            index: 'ecom_items_v3',
            queryPath: '_last_user_message',
            size: 15,
            fields: ['title', 'category', 'brand', 'description', 'tags'],
          },
          output: 'search_results',
        },
      ],
      transitions: {
        items_found: 'show_products',
        no_items: 'no_results',
      },
    },

    // Display products
    show_products: {
      type: 'action',
      description: 'Show product search results',
      actions: [
        {
          id: 'display_products',
          executor: 'llm',
          config: {
            systemPrompt: 'You are showing e-commerce products. Format with numbers, titles, prices, and key details.',
            prompt: `Show these products:
{{#each search_results.items}}
{{@index}}. {{this.title}}
   ₹{{this.mrp}} {{#if this.discount}}({{this.discount}}% off){{/if}}
   {{this.brand}} | {{this.category}}
{{/each}}

Ask them to:
- Select items by number and quantity (e.g., "1x2" for 2 units of item 1)
- Search for more items
- View cart if they've already added items`,
            temperature: 0.7,
            maxTokens: 400,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'process_user_action',
      },
    },

    // Process user action (add to cart, search more, checkout)
    process_user_action: {
      type: 'decision',
      description: 'Determine user action',
      conditions: [
        {
          expression: 'context._last_user_message?.match(/\\d+x\\d+/)',
          event: 'add_to_cart',
        },
        {
          expression: 'context._last_user_message?.toLowerCase().includes("cart") || context._last_user_message?.toLowerCase().includes("checkout")',
          event: 'view_cart',
        },
        {
          expression: 'context._last_user_message?.toLowerCase().includes("search") || context._last_user_message?.toLowerCase().includes("find")',
          event: 'search_more',
        },
      ],
      transitions: {
        add_to_cart: 'add_to_cart',
        view_cart: 'show_cart',
        search_more: 'search_products',
        default: 'show_products',
      },
    },

    // Add items to cart
    add_to_cart: {
      type: 'action',
      description: 'Parse and add selected items to cart',
      actions: [
        {
          id: 'parse_selection',
          executor: 'llm',
          config: {
            systemPrompt: 'Extract item selections from user message. Return JSON array.',
            prompt: 'User message: {{_last_user_message}}\n\nExtract selections as JSON: [{"itemIndex": 0, "quantity": 2}]',
            temperature: 0.2,
            maxTokens: 150,
          },
          output: '_selection_data',
        },
        {
          id: 'confirm_addition',
          executor: 'llm',
          config: {
            systemPrompt: 'Confirm items added to cart.',
            prompt: 'Items added to cart. Current cart has {{cart_items.length}} unique items. Ask if they want to continue shopping or proceed to checkout.',
            temperature: 0.7,
            maxTokens: 100,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'process_user_action',
      },
    },

    // Show cart
    show_cart: {
      type: 'action',
      description: 'Display shopping cart',
      actions: [
        {
          id: 'display_cart',
          executor: 'llm',
          config: {
            systemPrompt: 'Show shopping cart with items, quantities, prices, and total.',
            prompt: `Show cart:
{{#each cart_items}}
- {{this.title}} x{{this.quantity}} = ₹{{this.price * this.quantity}}
{{/each}}

Subtotal: ₹{{pricing.itemsTotal}}

Ask if they want to:
1. Proceed to checkout
2. Continue shopping
3. Clear cart`,
            temperature: 0.7,
            maxTokens: 300,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_cart_action',
      },
    },

    // Check cart action
    check_cart_action: {
      type: 'decision',
      description: 'Determine next step from cart',
      conditions: [
        {
          expression: 'context._last_user_message?.toLowerCase().includes("checkout") || context._last_user_message?.toLowerCase().includes("proceed")',
          event: 'proceed_checkout',
        },
        {
          expression: 'context._last_user_message?.toLowerCase().includes("shop") || context._last_user_message?.toLowerCase().includes("continue")',
          event: 'continue_shopping',
        },
        {
          expression: 'context._last_user_message?.toLowerCase().includes("clear") || context._last_user_message?.toLowerCase().includes("empty")',
          event: 'clear_cart',
        },
      ],
      transitions: {
        proceed_checkout: 'collect_address',
        continue_shopping: 'search_products',
        clear_cart: 'cancelled',
        default: 'show_cart',
      },
    },

    // Collect delivery address
    collect_address: {
      type: 'action',
      description: 'Get delivery address',
      actions: [
        {
          id: 'get_address',
          executor: 'address',
          config: {
            field: 'delivery_address',
            prompt: 'Where should we deliver your order?',
            offerSaved: true,
          },
          output: 'delivery_address',
          retryOnError: true,
          maxRetries: 3,
        },
      ],
      transitions: {
        address_valid: 'validate_zone',
        waiting_for_input: 'collect_address',
        error: 'address_error',
      },
    },

    // Validate zone
    validate_zone: {
      type: 'action',
      description: 'Check service area',
      actions: [
        {
          id: 'check_zone',
          executor: 'zone',
          config: {
            latPath: 'delivery_address.lat',
            lngPath: 'delivery_address.lng',
          },
          output: 'delivery_zone',
        },
      ],
      transitions: {
        zone_valid: 'calculate_pricing',
        zone_invalid: 'out_of_zone',
      },
    },

    // Calculate pricing
    calculate_pricing: {
      type: 'action',
      description: 'Calculate e-commerce order pricing',
      actions: [
        {
          id: 'get_pricing',
          executor: 'pricing',
          config: {
            type: 'ecommerce',
            itemsPath: 'cart_items',
            freeShippingThreshold: 500,
            shippingFee: 40,
            taxRate: 0.18,
          },
          output: 'pricing',
        },
      ],
      transitions: {
        calculated: 'show_order_summary',
      },
    },

    // Show order summary
    show_order_summary: {
      type: 'action',
      description: 'Display final order summary',
      actions: [
        {
          id: 'summary_message',
          executor: 'llm',
          config: {
            systemPrompt: 'Show e-commerce order summary clearly.',
            prompt: `Order Summary:
📦 Items: {{cart_items.length}} items
💰 Subtotal: ₹{{pricing.itemsTotal}}
🚚 Shipping: {{#if pricing.freeShipping}}FREE{{else}}₹{{pricing.shippingFee}}{{/if}}
🧾 GST (18%): ₹{{pricing.tax}}
💳 Total: ₹{{pricing.total}}

📍 Delivery: {{delivery_address.label}}
⏱️ Estimated: 1-2 days

Reply "confirm" to place order or "cancel" to cancel.`,
            temperature: 0.7,
            maxTokens: 300,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_final_confirmation',
      },
    },

    // Check confirmation
    check_final_confirmation: {
      type: 'decision',
      description: 'Evaluate confirmation',
      conditions: [
        {
          expression: 'context._last_user_message?.toLowerCase().includes("confirm") || context._last_user_message?.toLowerCase().includes("yes")',
          event: 'user_confirms',
        },
        {
          expression: 'context._last_user_message?.toLowerCase().includes("cancel") || context._last_user_message?.toLowerCase().includes("no")',
          event: 'user_cancels',
        },
      ],
      transitions: {
        user_confirms: 'place_order',
        user_cancels: 'cancelled',
        default: 'show_order_summary',
      },
    },

    // Place order
    place_order: {
      type: 'action',
      description: 'Create e-commerce order',
      actions: [
        {
          id: 'create_order',
          executor: 'order',
          config: {
            type: 'ecommerce',
            itemsPath: 'cart_items',
            addressPath: 'delivery_address',
            pricingPath: 'pricing',
          },
          output: 'order_result',
          retryOnError: true,
          maxRetries: 2,
        },
      ],
      transitions: {
        success: 'completed',
        error: 'order_failed',
      },
    },

    // Success
    completed: {
      type: 'end',
      description: 'Order placed successfully',
      actions: [
        {
          id: 'success_message',
          executor: 'llm',
          config: {
            systemPrompt: 'Confirm e-commerce order placement. Be positive!',
            prompt: `Order Confirmed! 🎉
✅ Order ID: {{order_result.orderId}}
💰 Total: ₹{{pricing.total}}
📍 Delivery: {{delivery_address.label}}
📦 Estimated: 1-2 business days

You'll receive order updates on WhatsApp. Track your order anytime!`,
            temperature: 0.8,
            maxTokens: 200,
          },
          output: '_last_response',
        },
      ],
      transitions: {},
    },

    // Error states
    no_results: {
      type: 'action',
      description: 'No products found',
      actions: [
        {
          id: 'no_results_message',
          executor: 'llm',
          config: {
            systemPrompt: 'Apologize and suggest alternatives.',
            prompt: 'No products found for "{{_last_user_message}}". Suggest browsing categories like groceries, electronics, fashion, home essentials. Ask what they\'re looking for.',
            temperature: 0.8,
            maxTokens: 120,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'understand_request',
      },
    },

    address_error: {
      type: 'end',
      description: 'Address collection failed',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t get your delivery address. Please try again later.',
          },
        },
      ],
      transitions: {},
    },

    out_of_zone: {
      type: 'end',
      description: 'Outside service area',
      actions: [
        {
          id: 'zone_error',
          executor: 'response',
          config: {
            message: 'Sorry, we don\'t deliver to this area yet. Currently serving Nashik city. We\'ll notify you when we expand!',
          },
        },
      ],
      transitions: {},
    },

    order_failed: {
      type: 'end',
      description: 'Order placement failed',
      actions: [
        {
          id: 'failure_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t place your order. Please try again in a few minutes.',
          },
        },
      ],
      transitions: {},
    },

    cancelled: {
      type: 'end',
      description: 'Order cancelled',
      actions: [
        {
          id: 'cancel_message',
          executor: 'response',
          config: {
            message: 'Your order has been cancelled. Your cart is saved, come back anytime! 🛒',
          },
        },
      ],
      transitions: {},
    },
  },

  initialState: 'check_trigger',
  finalStates: ['completed', 'cancelled', 'address_error', 'out_of_zone', 'order_failed'],
};
