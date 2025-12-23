import { FlowDefinition } from '../types/flow.types';

/**
 * Order Tracking Flow
 * 
 * Allows users to:
 * - View their current/running orders
 * - View order history
 * - Track a specific order
 * - Cancel an order
 * - Reorder from history
 */
export const orderTrackingFlow: FlowDefinition = {
  id: 'order_tracking_v1',
  name: 'Order Tracking Flow',
  description: 'Track orders, view history, cancel or reorder',
  module: 'general',
  trigger: 'track_order',
  version: '1.0.0',
  enabled: true,
  initialState: 'init',
  finalStates: ['end_flow'],
  
  contextSchema: {
    orders: { type: 'array', required: false },
    selected_order: { type: 'object', required: false },
    order_status: { type: 'string', required: false },
  },
  
  states: {
    // Initial state - check what user wants to do
    init: {
      type: 'decision',
      description: 'Determine what tracking action to take',
      conditions: [
        {
          expression: 'context._user_message && context._user_message.toLowerCase().includes("cancel")',
          event: 'wants_cancel',
        },
        {
          expression: 'context._user_message && (context._user_message.toLowerCase().includes("history") || context._user_message.toLowerCase().includes("past"))',
          event: 'wants_history',
        },
        {
          expression: 'context._user_message && context._user_message.toLowerCase().includes("reorder")',
          event: 'wants_reorder',
        },
      ],
      transitions: {
        wants_cancel: 'fetch_running_orders',
        wants_history: 'fetch_order_history',
        wants_reorder: 'fetch_order_history',
        default: 'show_options',
      },
    },

    // Show tracking options
    show_options: {
      type: 'wait',
      description: 'Show order tracking options',
      actions: [
        {
          id: 'show_menu',
          executor: 'response',
          config: {
            message: '📦 **Order Tracking**\n\nWhat would you like to do?',
            buttons: [
              { id: 'track_current', title: '🚚 Track Current Order', payload: 'track current order' },
              { id: 'view_history', title: '📋 Order History', payload: 'show order history' },
              { id: 'cancel_order', title: '❌ Cancel Order', payload: 'cancel my order' },
              { id: 'back', title: '🔙 Back to Menu', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // Route based on user selection
    route_action: {
      type: 'decision',
      description: 'Route to appropriate action',
      conditions: [
        {
          expression: 'context._user_message && (context._user_message.toLowerCase().includes("current") || context._user_message.toLowerCase().includes("track"))',
          event: 'track_current',
        },
        {
          expression: 'context._user_message && (context._user_message.toLowerCase().includes("history") || context._user_message.toLowerCase().includes("past"))',
          event: 'view_history',
        },
        {
          expression: 'context._user_message && context._user_message.toLowerCase().includes("cancel")',
          event: 'cancel_order',
        },
        {
          expression: 'context._user_message && (context._user_message.toLowerCase().includes("back") || context._user_message.toLowerCase().includes("menu"))',
          event: 'back_to_menu',
        },
      ],
      transitions: {
        track_current: 'fetch_running_orders',
        view_history: 'fetch_order_history',
        cancel_order: 'fetch_running_orders',
        back_to_menu: 'end_flow',
        default: 'show_options',
      },
    },

    // Fetch running orders
    fetch_running_orders: {
      type: 'action',
      description: 'Get running/active orders from PHP backend',
      actions: [
        {
          id: 'get_running',
          executor: 'order',
          config: {
            method: 'getRunningOrders',
          },
          output: 'running_orders',
        },
      ],
      transitions: {
        success: 'check_running_orders',
        error: 'no_orders_error',
      },
    },

    // Check if there are running orders
    check_running_orders: {
      type: 'decision',
      description: 'Check if user has running orders',
      conditions: [
        {
          expression: 'context.running_orders && context.running_orders.length > 0',
          event: 'has_orders',
        },
      ],
      transitions: {
        has_orders: 'display_running_orders',
        default: 'no_running_orders',
      },
    },

    // Display running orders
    display_running_orders: {
      type: 'wait',
      description: 'Show list of running orders',
      actions: [
        {
          id: 'format_orders',
          executor: 'llm',
          config: {
            systemPrompt: 'Format order list as a concise numbered list with emojis. Show order ID, status, and amount.',
            prompt: `Format these orders for display:
{{#each running_orders}}
- Order #{{this.id}}: {{this.orderStatus}} - ₹{{this.orderAmount}}
{{/each}}

Keep it under 200 chars. Use status emojis: ⏳pending ✅confirmed 📦processing 🚚picked_up 🤝handover ✅delivered`,
            temperature: 0.3,
            maxTokens: 150,
          },
          output: 'formatted_orders',
        },
        {
          id: 'show_orders',
          executor: 'response',
          config: {
            message: '🚚 **Your Active Orders**\n\n{{formatted_orders}}\n\nSelect an order to track or cancel:',
            buttons: [
              { id: 'select_first', title: 'Track Order #{{running_orders.[0].id}}', payload: 'track order {{running_orders.[0].id}}' },
              { id: 'cancel', title: '❌ Cancel an Order', payload: 'cancel order' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'handle_order_selection',
      },
    },

    // No running orders
    no_running_orders: {
      type: 'wait',
      description: 'Inform user they have no active orders',
      actions: [
        {
          id: 'no_orders_msg',
          executor: 'response',
          config: {
            message: '📭 You don\'t have any active orders right now.\n\nWould you like to view your order history or place a new order?',
            buttons: [
              { id: 'history', title: '📋 Order History', payload: 'show order history' },
              { id: 'new_order', title: '🍔 Order Food', payload: 'order food' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // Handle order selection
    handle_order_selection: {
      type: 'action',
      description: 'Extract order ID from user message',
      actions: [
        {
          id: 'extract_order_id',
          executor: 'llm',
          config: {
            systemPrompt: 'Extract order ID from message. Return JSON with "order_id" (number) and "action" (track/cancel).',
            prompt: `Message: "{{_user_message}}"
Available orders: {{running_orders}}

JSON:`,
            temperature: 0,
            maxTokens: 50,
            parseJson: true,
          },
          output: 'selection',
        },
      ],
      transitions: {
        success: 'process_selection',
        error: 'show_options',
      },
    },

    // Process the selection
    process_selection: {
      type: 'decision',
      description: 'Route based on action',
      conditions: [
        {
          expression: 'context.selection && context.selection.action === "cancel"',
          event: 'cancel',
        },
        {
          expression: 'context.selection && context.selection.order_id',
          event: 'track',
        },
      ],
      transitions: {
        cancel: 'confirm_cancel',
        track: 'track_order_details',
        default: 'display_running_orders',
      },
    },

    // Track specific order
    track_order_details: {
      type: 'action',
      description: 'Get detailed order status',
      actions: [
        {
          id: 'get_details',
          executor: 'order',
          config: {
            method: 'getOrderDetails',
            orderId: '{{selection.order_id}}',
          },
          output: 'order_details',
        },
        {
          id: 'track_location',
          executor: 'order',
          config: {
            method: 'trackOrder',
            orderId: '{{selection.order_id}}',
          },
          output: 'tracking',
        },
      ],
      transitions: {
        success: 'show_tracking_details',
        error: 'tracking_error',
      },
    },

    // Show tracking details
    show_tracking_details: {
      type: 'wait',
      description: 'Display order tracking information',
      actions: [
        {
          id: 'format_tracking',
          executor: 'llm',
          config: {
            systemPrompt: 'Format order tracking details nicely with emojis. Be concise.',
            prompt: `Order: {{order_details}}
Tracking: {{tracking}}

Format a tracking status message showing:
- Order ID and status
- Estimated delivery (if available)
- Delivery person location (if available)
Keep under 200 chars.`,
            temperature: 0.3,
            maxTokens: 150,
          },
          output: 'tracking_message',
        },
        {
          id: 'show_tracking',
          executor: 'response',
          config: {
            message: '📍 **Order Tracking**\n\n{{tracking_message}}',
            buttons: [
              { id: 'refresh', title: '🔄 Refresh', payload: 'track order {{selection.order_id}}' },
              { id: 'cancel', title: '❌ Cancel Order', payload: 'cancel order {{selection.order_id}}' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // Confirm cancellation
    confirm_cancel: {
      type: 'wait',
      description: 'Confirm order cancellation',
      actions: [
        {
          id: 'confirm_msg',
          executor: 'response',
          config: {
            message: '⚠️ Are you sure you want to cancel this order?\n\nThis action cannot be undone.',
            buttons: [
              { id: 'yes', title: '✅ Yes, Cancel', payload: 'yes cancel' },
              { id: 'no', title: '❌ No, Keep Order', payload: 'no keep' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'process_cancel_confirmation',
      },
    },

    // Process cancel confirmation
    process_cancel_confirmation: {
      type: 'decision',
      description: 'Check if user confirmed cancellation',
      conditions: [
        {
          expression: 'context._user_message && (context._user_message.toLowerCase().includes("yes") || context._user_message.toLowerCase().includes("cancel"))',
          event: 'confirmed',
        },
      ],
      transitions: {
        confirmed: 'cancel_order_api',
        default: 'display_running_orders',
      },
    },

    // Cancel order via API
    cancel_order_api: {
      type: 'action',
      description: 'Cancel order in PHP backend',
      actions: [
        {
          id: 'cancel',
          executor: 'order',
          config: {
            method: 'cancelOrder',
            orderId: '{{selection.order_id}}',
            reason: 'Customer requested cancellation via chatbot',
          },
          output: 'cancel_result',
        },
      ],
      transitions: {
        success: 'cancel_success',
        error: 'cancel_error',
      },
    },

    // Cancellation success
    cancel_success: {
      type: 'wait',
      description: 'Order cancelled successfully',
      actions: [
        {
          id: 'success_msg',
          executor: 'response',
          config: {
            message: '✅ Your order has been cancelled successfully.\n\nIf you were charged, a refund will be processed within 5-7 business days.',
            buttons: [
              { id: 'new_order', title: '🍔 Order Again', payload: 'order food' },
              { id: 'back', title: '🔙 Back to Menu', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'end_flow',
      },
    },

    // Cancel error
    cancel_error: {
      type: 'wait',
      description: 'Order cancellation failed',
      actions: [
        {
          id: 'error_msg',
          executor: 'response',
          config: {
            message: '❌ Sorry, we couldn\'t cancel your order.\n\nThis may be because the order is already being prepared. Please contact support for assistance.',
            buttons: [
              { id: 'support', title: '📞 Contact Support', payload: 'contact support' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // Fetch order history
    fetch_order_history: {
      type: 'action',
      description: 'Get order history from PHP backend',
      actions: [
        {
          id: 'get_history',
          executor: 'order',
          config: {
            method: 'getOrders',
            limit: 10,
          },
          output: 'order_history',
        },
      ],
      transitions: {
        success: 'check_order_history',
        error: 'no_orders_error',
      },
    },

    // Check if there's order history
    check_order_history: {
      type: 'decision',
      description: 'Check if user has order history',
      conditions: [
        {
          expression: 'context.order_history && context.order_history.length > 0',
          event: 'has_history',
        },
      ],
      transitions: {
        has_history: 'display_order_history',
        default: 'no_order_history',
      },
    },

    // Display order history
    display_order_history: {
      type: 'wait',
      description: 'Show order history list',
      actions: [
        {
          id: 'format_history',
          executor: 'llm',
          config: {
            systemPrompt: 'Format order history as a brief numbered list. Show order ID, status, date, and amount.',
            prompt: `Format these past orders:
{{#each order_history}}
- Order #{{this.id}}: {{this.orderStatus}} - ₹{{this.orderAmount}} on {{this.createdAt}}
{{/each}}

Keep it concise with status emojis.`,
            temperature: 0.3,
            maxTokens: 200,
          },
          output: 'formatted_history',
        },
        {
          id: 'show_history',
          executor: 'response',
          config: {
            message: '📋 **Your Order History**\n\n{{formatted_history}}\n\nWould you like to reorder any of these?',
            buttons: [
              { id: 'reorder', title: '🔄 Reorder Last', payload: 'reorder last order' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'handle_history_action',
      },
    },

    // No order history
    no_order_history: {
      type: 'wait',
      description: 'Inform user they have no order history',
      actions: [
        {
          id: 'no_history_msg',
          executor: 'response',
          config: {
            message: '📭 You haven\'t placed any orders yet.\n\nLet\'s change that! What would you like to order?',
            buttons: [
              { id: 'food', title: '🍔 Order Food', payload: 'order food' },
              { id: 'parcel', title: '📦 Send Parcel', payload: 'send parcel' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'end_flow',
      },
    },

    // Handle history action (reorder)
    handle_history_action: {
      type: 'decision',
      description: 'Handle reorder or other actions',
      conditions: [
        {
          expression: 'context._user_message && context._user_message.toLowerCase().includes("reorder")',
          event: 'reorder',
        },
      ],
      transitions: {
        reorder: 'reorder_confirmation',
        default: 'route_action',
      },
    },

    // Reorder confirmation
    reorder_confirmation: {
      type: 'wait',
      description: 'Confirm reorder',
      actions: [
        {
          id: 'confirm_reorder',
          executor: 'response',
          config: {
            message: '🔄 Ready to reorder your last order?\n\nThis will add the same items to your cart.',
            buttons: [
              { id: 'yes', title: '✅ Yes, Reorder', payload: 'yes reorder' },
              { id: 'no', title: '❌ No, Browse Menu', payload: 'order food' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'process_reorder',
      },
    },

    // Process reorder
    process_reorder: {
      type: 'decision',
      description: 'Check if user confirmed reorder',
      conditions: [
        {
          expression: 'context._user_message && context._user_message.toLowerCase().includes("yes")',
          event: 'confirmed',
        },
      ],
      transitions: {
        confirmed: 'trigger_reorder',
        default: 'end_flow',
      },
    },

    // Trigger reorder (start food order flow with last order items)
    trigger_reorder: {
      type: 'action',
      description: 'Set up reorder context and redirect to food order flow',
      actions: [
        {
          id: 'reorder_msg',
          executor: 'response',
          config: {
            message: '✅ Great! I\'ve added your previous order items. Let me help you complete the order.',
          },
          output: 'reorder_context',
        },
      ],
      transitions: {
        success: 'end_flow', // Will trigger food_order flow with pre-filled items
      },
    },

    // Generic error state
    no_orders_error: {
      type: 'wait',
      description: 'Error fetching orders',
      actions: [
        {
          id: 'error_msg',
          executor: 'response',
          config: {
            message: '❌ Sorry, I couldn\'t fetch your orders. Please try again later.',
            buttons: [
              { id: 'retry', title: '🔄 Try Again', payload: 'track order' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // Tracking error
    tracking_error: {
      type: 'wait',
      description: 'Error tracking order',
      actions: [
        {
          id: 'error_msg',
          executor: 'response',
          config: {
            message: '❌ Sorry, I couldn\'t get tracking info for this order.',
            buttons: [
              { id: 'retry', title: '🔄 Try Again', payload: 'track order' },
              { id: 'back', title: '🔙 Back', payload: 'back to menu' },
            ],
          },
        },
      ],
      transitions: {
        user_message: 'route_action',
      },
    },

    // End flow
    end_flow: {
      type: 'end',
      description: 'End the order tracking flow',
      actions: [],
      transitions: {},
    },
  },
  
  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-01-01',
    tags: ['order', 'tracking', 'history'],
    priority: 65,
  },
};
