import { FlowDefinition } from '../types/flow.types';

export const parcelDeliveryFlow: FlowDefinition = {
  id: 'parcel_delivery_v1',
  name: 'Coolie / Local Delivery Flow',
  description: 'Complete local delivery (Coolie) booking flow with pickup, delivery, pricing and order placement',
  module: 'parcel',
  trigger: 'parcel_booking',
  version: '1.0.0',
  
  contextSchema: {
    pickup_address: { type: 'object', required: true },
    delivery_address: { type: 'object', required: true },
    distance: { type: 'number', required: true },
    pricing: { type: 'object', required: true },
    order_result: { type: 'object', required: false },
    parcel_details: { type: 'object', required: false },
  },
  
  states: {
    // Check trigger
    check_trigger: {
      type: 'decision',
      description: 'Check if user already provided details',
      conditions: [
        {
          expression: 'context._user_message && context._user_message.length > 10 && (context._user_message.toLowerCase().includes("from") || context._user_message.toLowerCase().includes("send"))',
          event: 'has_details',
        }
      ],
      transitions: {
        has_details: 'collect_pickup',
        default: 'init',
      },
    },

    // Initial state - welcome and explain process
    init: {
      type: 'wait',  // Changed to 'wait' so we wait for user response
      description: 'Welcome user and explain coolie service',
      onEntry: [
        {
          id: 'welcome_message',
          executor: 'response',
          config: {
            message: 'I can help you send items anywhere in Nashik. Where should I pick it up from?\n\n📍 Share your pickup location or type the address.',
          },
          output: '_last_response',
        },
      ],
      actions: [],
      transitions: {
        user_message: 'process_pickup_address',  // Go directly to processing
      },
    },

    // Collect pickup address
    collect_pickup: {
      type: 'wait',  // Changed from 'action' to 'wait' so we get user input
      description: 'Collect pickup address with saved addresses support',
      onEntry: [
        {
          id: 'ask_pickup',
          executor: 'response',
          config: {
            message: 'Where should we pick up the parcel from?\n\n📍 Share location or type your pickup address.',
          },
          output: '_last_response',
        },
      ],
      actions: [
        {
          id: 'get_pickup_address',
          executor: 'address',
          config: {
            field: 'pickup_address',
            prompt: 'Where should we pick up the parcel from?',
            offerSaved: true,
          },
          output: 'pickup_address',
          retryOnError: true,
          maxRetries: 3,
        },
      ],
      transitions: {
        address_valid: 'validate_pickup_zone',
        waiting_for_input: 'collect_pickup',  // Stay in this state if waiting
        error: 'pickup_error',
        user_message: 'process_pickup_address',  // Process new user input
      },
    },

    // Process pickup address from user
    process_pickup_address: {
      type: 'action',
      description: 'Process the pickup address provided by user',
      actions: [
        {
          id: 'extract_pickup',
          executor: 'address',
          config: {
            field: 'pickup_address',
            input: '{{_user_message}}',
          },
          output: 'pickup_address',
        },
      ],
      transitions: {
        address_valid: 'validate_pickup_zone',
        waiting_for_input: 'collect_pickup',
        error: 'pickup_error',
      },
    },

    // Validate pickup is in service zone
    validate_pickup_zone: {
      type: 'action',
      description: 'Check if pickup location is in Nashik service area',
      actions: [
        {
          id: 'check_pickup_zone',
          executor: 'zone',
          config: {
            latPath: 'pickup_address.latitude',
            lngPath: 'pickup_address.longitude',
          },
          output: 'pickup_zone',
        },
      ],
      transitions: {
        zone_valid: 'collect_delivery',
        zone_invalid: 'pickup_out_of_zone',
      },
    },

    // Collect delivery address
    collect_delivery: {
      type: 'action',
      description: 'Collect delivery address',
      actions: [
        {
          id: 'get_delivery_address',
          executor: 'address',
          config: {
            field: 'delivery_address',
            prompt: 'Where should we deliver the parcel?',
            offerSaved: true,
          },
          output: 'delivery_address',
          retryOnError: true,
          maxRetries: 3,
        },
      ],
      transitions: {
        address_valid: 'validate_delivery_zone',
        waiting_for_input: 'wait_for_delivery',
        error: 'delivery_error',
      },
    },

    // Wait for delivery input
    wait_for_delivery: {
      type: 'wait',
      description: 'Wait for user to provide delivery address',
      actions: [],
      transitions: {
        user_message: 'collect_delivery',
      },
    },

    // Validate delivery is in service zone
    validate_delivery_zone: {
      type: 'action',
      description: 'Check if delivery location is in service area',
      actions: [
        {
          id: 'check_delivery_zone',
          executor: 'zone',
          config: {
            latPath: 'delivery_address.latitude',
            lngPath: 'delivery_address.longitude',
          },
          output: 'delivery_zone',
        },
      ],
      transitions: {
        zone_valid: 'collect_recipient_details',
        zone_invalid: 'delivery_out_of_zone',
      },
    },

    // Collect recipient details (Name & Phone)
    collect_recipient_details: {
      type: 'action',
      description: 'Ask for recipient name and phone number',
      actions: [
        {
          id: 'ask_recipient_details',
          executor: 'llm',
          config: {
            systemPrompt: 'You are Mangwale Coolie. You need the recipient\'s Name and Phone Number. Ask the user for these details directly. Do not explain what you are doing. Do not say "Here is a prompt". Just ask the question.',
            prompt: 'Ask the user for the Recipient\'s Name and Phone Number.',
            temperature: 0.7,
            maxTokens: 100,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'extract_recipient_details',
      },
    },

    // Extract recipient details
    extract_recipient_details: {
      type: 'action',
      description: 'Extract recipient name and phone from user message',
      actions: [
        {
          id: 'extract_recipient',
          executor: 'llm',
          config: {
            systemPrompt: 'Extract recipient name and phone number from the message. Return JSON.',
            prompt: 'User message: {{_user_message}}\n\nExtract:\n{\n  "name": "John Doe",\n  "phone": "9876543210"\n}\nIf missing, return null for that field.',
            temperature: 0.1,
            maxTokens: 150,
            parseJson: true,
          },
          output: 'recipient_details',
        },
      ],
      transitions: {
        success: 'check_recipient_validity',
        error: 'collect_recipient_details',
      },
    },

    // Check if recipient details are valid
    check_recipient_validity: {
      type: 'decision',
      description: 'Check if we got both name and phone',
      conditions: [
        {
          expression: 'context.recipient_details?.name && context.recipient_details?.phone',
          event: 'details_valid',
        },
      ],
      transitions: {
        details_valid: 'fetch_categories',
        default: 'collect_recipient_details', // Ask again if missing
      },
    },

    // Fetch vehicle categories
    fetch_categories: {
      type: 'action',
      description: 'Fetch available vehicle categories',
      actions: [
        {
          id: 'get_categories',
          executor: 'parcel',
          config: {
            action: 'get_categories',
            pickupAddressPath: 'pickup_address',
          },
          output: 'vehicle_categories',
        },
      ],
      transitions: {
        categories_fetched: 'show_categories',
        error: 'category_error',
      },
    },

    // Show categories and wait for selection
    show_categories: {
      type: 'wait',
      description: 'Show vehicle categories and wait for selection',
      actions: [
        {
          id: 'show_vehicle_cards',
          executor: 'response',
          config: {
            message: 'Please select a vehicle for your delivery:',
            cardsPath: 'vehicle_categories',
          },
        },
      ],
      transitions: {
        user_message: 'handle_vehicle_selection',
      },
    },

    // Handle vehicle selection
    handle_vehicle_selection: {
      type: 'action',
      description: 'Process vehicle selection',
      actions: [
        {
          id: 'interpret_vehicle_selection',
          executor: 'llm',
          config: {
            systemPrompt: 'You are a helper extracting the vehicle choice from user input. Return ONLY the category ID number.',
            prompt: `User said: "{{_user_message}}"
Available categories: {{json vehicle_categories}}

Which category ID did the user select?
- If user typed a number like "1", "2", "5", return that number if it exists in the category IDs
- If user typed a name like "bike", "scooter", "truck", return the matching category ID
- Return ONLY the ID number (e.g. 1, 5, 8, 9), nothing else
- If no match found, return "null"`,
            temperature: 0.1,
            maxTokens: 10,
            skipHistory: true, // Don't include conversation history for simple extraction
          },
          output: 'selected_category_id_raw',
        },
        {
          id: 'save_vehicle_selection',
          executor: 'response',
          config: {
             saveToContext: {
               'parcel_category_id': '{{selected_category_id_raw}}',
             }
          }
        }
      ],
      transitions: {
        success: 'validate_vehicle_selection',
      }
    },

    // Validate vehicle selection
    validate_vehicle_selection: {
      type: 'decision',
      description: 'Check if a valid vehicle was selected',
      conditions: [
        {
          expression: 'context.parcel_category_id && context.parcel_category_id !== "null"',
          event: 'valid_selection',
        }
      ],
      transitions: {
        valid_selection: 'calculate_distance',
        default: 'show_categories_retry',
      }
    },

    // Retry showing categories
    show_categories_retry: {
      type: 'wait',
      description: 'Show vehicle categories again with error message',
      actions: [
        {
          id: 'show_vehicle_cards_retry',
          executor: 'response',
          config: {
            message: 'I didn\'t catch that. Please select a vehicle from the list:',
            cardsPath: 'vehicle_categories',
          },
        },
      ],
      transitions: {
        user_message: 'handle_vehicle_selection',
      },
    },

    // Calculate distance between pickup and delivery
    calculate_distance: {
      type: 'action',
      description: 'Calculate distance using OSRM',
      actions: [
        {
          id: 'get_distance',
          executor: 'distance',
          config: {
            fromLatPath: 'pickup_address.latitude',
            fromLngPath: 'pickup_address.longitude',
            toLatPath: 'delivery_address.latitude',
            toLngPath: 'delivery_address.longitude',
          },
          output: 'distance',
          retryOnError: true,
          maxRetries: 2,
        },
      ],
      transitions: {
        calculated: 'calculate_pricing',
        error: 'distance_error',
      },
    },

    // Calculate pricing
    calculate_pricing: {
      type: 'action',
      description: 'Calculate parcel delivery pricing',
      actions: [
        {
          id: 'get_pricing',
          executor: 'parcel',
          config: {
            action: 'calculate_shipping',
            distancePath: 'distance',
            categoryPath: 'parcel_category_id',
          },
          output: 'pricing',
        },
      ],
      transitions: {
        shipping_calculated: 'show_summary',
        error: 'pricing_error',
      },
    },

    // Show order summary and ask for confirmation
    show_summary: {
      type: 'action',
      description: 'Display order summary and request confirmation',
      actions: [
        {
          id: 'summary_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are showing an order summary. Be clear and concise. Always show prices.',
            prompt: `Create a beautiful order summary with:
- Pickup: {{#if pickup_address.label}}{{pickup_address.label}}{{else}}{{pickup_address.formatted}}{{/if}}
- Delivery: {{#if delivery_address.label}}{{delivery_address.label}}{{else}}{{delivery_address.formatted}}{{/if}}
- Recipient: {{recipient_details.name}} ({{recipient_details.phone}})
- Distance: {{distance}} km
- Vehicle Category ID: {{parcel_category_id}}
- Base Fare: ₹{{pricing.delivery_charge}}
- Tax: ₹{{pricing.tax}}
- Total: ₹{{pricing.total_charge}}

Please ask the user to confirm the order. Tell them to reply with "yes" to confirm or "no" to cancel.`,
            temperature: 0.7,
            maxTokens: 200,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_confirmation',
      },
    },

    // Check if user confirmed
    check_confirmation: {
      type: 'decision',
      description: 'Evaluate user confirmation',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("yes") || context._user_message?.toLowerCase().includes("confirm") || context._user_message?.toLowerCase().includes("sure")',
          event: 'user_confirms',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("no") || context._user_message?.toLowerCase().includes("cancel")',
          event: 'user_cancels',
        },
      ],
      transitions: {
        user_confirms: 'place_order',
        user_cancels: 'cancelled',
        default: 'show_summary',
      },
    },

    // Place the order
    place_order: {
      type: 'action',
      description: 'Create parcel order in backend',
      actions: [
        {
          id: 'create_order',
          executor: 'order',
          config: {
            type: 'parcel',
            pickupAddressPath: 'pickup_address',
            deliveryAddressPath: 'delivery_address',
            recipientPath: 'recipient_details',
            distancePath: 'distance',
            pricingPath: 'pricing',
            detailsPath: 'parcel_details',
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

    // Success - order placed
    completed: {
      type: 'action',
      description: 'Order successfully placed',
      actions: [
        {
          id: 'success_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are confirming a successful parcel order. Be enthusiastic and helpful.',
            prompt: `Confirm order placement with:
- Order ID: {{order_result.orderId}}
- Pickup: {{#if pickup_address.label}}{{pickup_address.label}}{{else}}{{pickup_address.formatted}}{{/if}}
- Delivery: {{#if delivery_address.label}}{{delivery_address.label}}{{else}}{{delivery_address.formatted}}{{/if}}
- Total: ₹{{pricing.total_charge}}
- Estimated delivery: 30-45 minutes

Mention they can track the order and will receive updates on WhatsApp.`,
            temperature: 0.8,
            maxTokens: 200,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        default: 'finish',
      },
    },

    finish: {
      type: 'end',
      description: 'Flow finished',
      actions: [],
      transitions: {},
    },

    // Error states
    pickup_error: {
      type: 'end',
      description: 'Failed to get valid pickup address',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t understand your pickup address. Please try again later or contact support.',
          },
        },
      ],
      transitions: {},
    },

    delivery_error: {
      type: 'end',
      description: 'Failed to get valid delivery address',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t understand your delivery address. Please try again later or contact support.',
          },
        },
      ],
      transitions: {},
    },

    pickup_out_of_zone: {
      type: 'end',
      description: 'Pickup location outside service area',
      actions: [
        {
          id: 'zone_error',
          executor: 'response',
          config: {
            message: 'Sorry, the pickup location is outside our current service area (Nashik). We\'ll let you know when we expand to your area!',
          },
        },
      ],
      transitions: {},
    },

    delivery_out_of_zone: {
      type: 'end',
      description: 'Delivery location outside service area',
      actions: [
        {
          id: 'zone_error',
          executor: 'response',
          config: {
            message: 'Sorry, the delivery location is outside our current service area (Nashik). We\'ll let you know when we expand to your area!',
          },
        },
      ],
      transitions: {},
    },

    distance_error: {
      type: 'end',
      description: 'Failed to calculate distance',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we encountered an error calculating the distance. Please try again or contact support.',
          },
        },
      ],
      transitions: {},
    },

    category_error: {
      type: 'end',
      description: 'Failed to fetch categories',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t fetch the available vehicles. Please try again later.',
          },
        },
      ],
      transitions: {},
    },

    pricing_error: {
      type: 'end',
      description: 'Failed to calculate pricing',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t calculate the shipping charge. Please try again later.',
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
            message: 'Sorry, we couldn\'t place your order right now. Please try again in a few minutes or contact support.',
          },
        },
      ],
      transitions: {},
    },

    cancelled: {
      type: 'end',
      description: 'User cancelled the order',
      actions: [
        {
          id: 'cancel_message',
          executor: 'response',
          config: {
            message: 'No problem! Your order has been cancelled. Feel free to order whenever you\'re ready!',
          },
        },
      ],
      transitions: {},
    },
  },

  initialState: 'check_trigger',
  finalStates: ['finish', 'cancelled', 'pickup_error', 'delivery_error', 'pickup_out_of_zone', 'delivery_out_of_zone', 'distance_error', 'order_failed', 'category_error', 'pricing_error'],
};
