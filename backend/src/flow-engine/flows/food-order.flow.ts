import { FlowDefinition } from '../types/flow.types';

export const foodOrderFlow: FlowDefinition = {
  id: 'food_order_v1',
  name: 'Food Order Flow',
  description: 'Complete food ordering flow with search, selection, address, and payment',
  module: 'food',
  trigger: 'order_food|browse_menu|browse_category|ask_recommendation|ask_famous|check_availability',
  version: '1.0.0',
  
  contextSchema: {
    search_query: { type: 'string', required: false },
    search_results: { type: 'array', required: false },
    selected_items: { type: 'array', required: true },
    delivery_address: { type: 'object', required: true },
    distance: { type: 'number', required: true },
    pricing: { type: 'object', required: true },
    order_result: { type: 'object', required: false },
    // Custom Order / Parcel Fallback Context
    custom_pickup_location: { type: 'object', required: false },
    custom_item_details: { type: 'string', required: false },
    is_custom_order: { type: 'boolean', required: false },
  },
  
  states: {
    // Check if flow was triggered with a specific request
    check_trigger: {
      type: 'decision',
      description: 'Check if user already specified what they want',
      conditions: [
        {
          // If message is long enough and not just a greeting, assume it's a query
          // Check both user_message and _user_message to be safe
          expression: '(context.user_message || context._user_message) && (context.user_message || context._user_message).length > 3 && !["hi", "hello", "hey", "start"].includes((context.user_message || context._user_message).toLowerCase())',
          event: 'has_query',
        }
      ],
      transitions: {
        has_query: 'save_original_query',
        default: 'greet_user',
      },
    },

    // 💾 NEW: Save the original query before asking for location
    save_original_query: {
      type: 'action',
      description: 'Save the original user query so we can use it after location is collected',
      actions: [
        {
          id: 'save_query',
          executor: 'response',
          config: {
            saveToContext: {
              original_food_query: '{{_user_message}}',
            },
            event: 'saved',
          },
        },
      ],
      transitions: {
        saved: 'check_location',
        default: 'check_location',
      },
    },

    // 📍 Check if we have user location before searching
    check_location: {
      type: 'decision',
      description: 'Check if user location is available for geo-filtered search',
      conditions: [
        {
          // Location exists and is less than 2 hours old
          expression: 'context.location && context.location.lat && context.location.lng',
          event: 'has_location',
        }
      ],
      transitions: {
        has_location: 'understand_request',
        default: 'request_location',
      },
    },

    // 📍 NEW: Request location from user
    request_location: {
      type: 'wait',
      description: 'Ask user to share their location for better results',
      onEntry: [
        {
          id: 'ask_location',
          executor: 'response',
          config: {
            message: '📍 To show you the best food options nearby, please share your location!\n\nTap the button below or type your area name.',
            responseType: 'request_location',
            buttons: [
              { id: 'btn_location', label: '📍 Share Location', value: '__LOCATION__' },
              { id: 'btn_skip', label: 'Skip for now', value: 'skip_location' }
            ]
          },
          output: '_last_response',
        }
      ],
      actions: [],
      transitions: {
        location_shared: 'understand_request',
        user_message: 'handle_location_response',
      },
    },

    // 📍 NEW: Handle location response (GPS coordinates, text input, or skip)
    handle_location_response: {
      type: 'decision',
      description: 'Check if user shared GPS location, skipped, or provided area name',
      conditions: [
        {
          // Check if GPS coordinates were shared (location object in context)
          expression: 'context.location?.lat && context.location?.lng',
          event: 'location_shared',
        },
        {
          // Check if _raw_location has coordinates (from message)
          expression: 'context._raw_location?.lat && context._raw_location?.lng',
          event: 'location_shared',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("skip")',
          event: 'skipped',
        }
      ],
      transitions: {
        location_shared: 'restore_original_query', // GPS coordinates received - restore query first
        skipped: 'restore_original_query', // Continue without location
        default: 'extract_location_from_text',
      },
    },

    // 🔄 NEW: Restore the original food query after location is collected
    restore_original_query: {
      type: 'action',
      description: 'Restore the original food query to _user_message for NLU analysis',
      actions: [
        {
          id: 'restore_query',
          executor: 'response',
          config: {
            saveToContext: {
              _user_message: '{{original_food_query}}',
            },
            event: 'restored',
          },
        },
      ],
      transitions: {
        restored: 'understand_request',
        default: 'understand_request',
      },
    },

    // 📍 NEW: Try to extract location from text
    extract_location_from_text: {
      type: 'action',
      description: 'Extract location from user area name',
      actions: [
        {
          id: 'parse_area',
          executor: 'address',
          config: {
            field: 'location',
            useUserMessage: true,
            city: 'Nashik',
          },
          output: 'location',
        }
      ],
      transitions: {
        address_valid: 'understand_request',
        waiting_for_input: 'request_location', // Go back to request if address not found
        error: 'understand_request', // Continue even if extraction fails
        default: 'understand_request', // Fallback
      },
    },

    // Initial state - welcome (renamed from init)
    greet_user: {
      type: 'wait',
      description: 'Welcome user and ask what they want to order',
      actions: [
        {
          id: 'welcome_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are Mangwale Food Assistant. Be concise (max 2 sentences).',
            prompt: `Greet {{user_name}}. Ask what they want to eat today (e.g., "Misal Pav", "Pizza").`,
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

    // Understand what user wants
    understand_request: {
      type: 'action',
      description: 'Extract food intent and entities',
      actions: [
        {
          id: 'analyze_request',
          executor: 'nlu',
          config: {
            extractEntities: true,
          },
          output: 'food_nlu',
        },
        {
          id: 'extract_food_details',
          executor: 'llm',
          config: {
            systemPrompt: 'You are a JSON extractor. Extract food order details. Return JSON only, no explanations.',
            // 💾 Use original_food_query if available (preserved before location request), otherwise use current message
            prompt: `User message: "{{#if original_food_query}}{{original_food_query}}{{else}}{{user_message}}{{/if}}"

Extract into JSON:
{
  "item": "primary food item(s) user wants",
  "restaurant": "restaurant/cafe name if user mentioned one (e.g., 'from Inayat Cafe'), otherwise null",
  "search_query": "ONLY the food items to search for, WITHOUT restaurant name"
}

IMPORTANT: 
- search_query should NOT include "from [restaurant]" - only food items!
- Restaurant/cafe names like "Inayat Cafe", "McDonald's", "Dominos" go in "restaurant" field

Examples:
- "paneer tikka from inayat cafe" → {"item":"paneer tikka","restaurant":"Inayat Cafe","search_query":"paneer tikka"}
- "pizza and burger from dominos" → {"item":"pizza, burger","restaurant":"Dominos","search_query":"pizza burger"}
- "order biryani" → {"item":"biryani","restaurant":null,"search_query":"biryani"}
- "paneer tikka, butter naan and chicken tikka from inayat cafe" → {"item":"paneer tikka, butter naan, chicken tikka","restaurant":"Inayat Cafe","search_query":"paneer tikka butter naan chicken tikka"}

JSON:`,
            temperature: 0.1,
            maxTokens: 150,
            parseJson: true
          },
          output: 'extracted_food',
        }
      ],
      transitions: {
        success: 'check_restaurant_filter',
        order_food: 'check_restaurant_filter',
        search_product: 'check_restaurant_filter',
        browse_menu: 'check_restaurant_filter',
        browse_category: 'check_restaurant_filter',
        ask_recommendation: 'show_recommendations',
        ask_famous: 'check_restaurant_filter',
        check_availability: 'check_restaurant_filter',
        default: 'check_restaurant_filter',
      },
    },

    // Search for food items
    // Decision state to check if restaurant filter is needed
    check_restaurant_filter: {
      type: 'decision',
      description: 'Check if user specified a restaurant to filter by',
      conditions: [
        {
          // If restaurant was extracted, use filtered search
          expression: 'context.extracted_food?.restaurant && context.extracted_food.restaurant !== "null" && context.extracted_food.restaurant !== null',
          event: 'has_restaurant',
        }
      ],
      transitions: {
        has_restaurant: 'search_food_with_restaurant',
        default: 'search_food',
      },
    },

    // Search with restaurant filter
    search_food_with_restaurant: {
      type: 'action',
      description: 'Search OpenSearch for food items filtered by restaurant name',
      actions: [
        {
          id: 'search_items_restaurant',
          executor: 'search',
          config: {
            index: 'food_items_v3',  // Use v3 index with 768-dim item_vector embeddings
            query: '{{extracted_food.search_query}}',
            size: 20,  // Get more results when filtering by restaurant
            fields: ['name', 'category_name', 'description', 'store_name'],
            formatForUi: true,
            lat: '{{location.lat}}',
            lng: '{{location.lng}}',
            radius: '10km',  // 10km radius for nearby restaurants
            filters: [
              { field: 'store_name', operator: 'contains', value: '{{extracted_food.restaurant}}' }
            ],
          },
          output: 'search_results',
        },
      ],
      transitions: {
        items_found: 'show_results',
        no_items: 'search_food',  // Fallback to unfiltered search if restaurant not found
        error: 'search_food',
      },
    },

    search_food: {
      type: 'action',
      description: 'Search OpenSearch for food items with vector embeddings',
      actions: [
        {
          id: 'search_items',
          executor: 'search',
          config: {
            index: 'food_items_v3',  // Use v3 index with 768-dim item_vector embeddings
            query: '{{extracted_food.search_query}}',
            size: 10,
            fields: ['name', 'category_name', 'description', 'store_name'],
            formatForUi: true,
            lat: '{{location.lat}}',
            lng: '{{location.lng}}',
            radius: '10km',  // 10km radius for nearby restaurants
          },
          output: 'search_results',
        },
      ],
      transitions: {
        items_found: 'show_results',
        no_items: 'analyze_no_results',
        error: 'analyze_no_results', // Handle search errors gracefully
      },
    },

    // Show popular/recommended items
    show_recommendations: {
      type: 'action',
      description: 'Show top-rated and popular items',
      actions: [
        {
          id: 'get_recommendations',
          executor: 'search',
          config: {
            index: 'food_items_v3',  // Use v3 index with embeddings
            query: 'popular best trending top rated',
            size: 10,
            fields: ['name', 'category_name', 'description', 'store_name'],
            formatForUi: true,
            sortBy: 'rating',
            lat: '{{location.lat}}',
            lng: '{{location.lng}}',
            radius: '15km',  // 15km for recommendations (wider search)
          },
          output: 'recommendation_results',
        },
      ],
      transitions: {
        items_found: 'display_recommendations',
        no_items: 'no_recommendations',
        error: 'no_recommendations',
      },
    },

    // Display recommendations to user
    display_recommendations: {
      type: 'wait',
      description: 'Show recommended items',
      actions: [
        {
          id: 'show_recs',
          executor: 'response',
          config: {
            message: '🌟 Here are our top recommendations for you! Tap any item to order:',
            dynamicMetadata: {
              cards: 'recommendation_results.cards'
            }
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'understand_request',
        item_selected: 'process_selection',
        default: 'understand_request',
      }
    },

    // No recommendations fallback
    no_recommendations: {
      type: 'wait',
      description: 'No recommendations available',
      actions: [
        {
          id: 'no_recs_msg',
          executor: 'response',
          config: {
            message: 'Aapke liye recommendations load nahi ho paye. Kya order karna chahte ho? Pizza, Biryani, ya kuch aur?',
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'understand_request',
      }
    },

    // Analyze why search failed and if we can offer custom pickup
    analyze_no_results: {
      type: 'action',
      description: 'Check if user asked for specific restaurant not in DB',
      actions: [
        {
          id: 'analyze_failure',
          executor: 'llm',
          config: {
            systemPrompt: 'Analyze if the user requested a specific restaurant or item that was not found.',
            prompt: 'User query: "{{extracted_food.search_query}}". Did they mention a specific restaurant name? Return JSON: {"specific_restaurant": true/false, "restaurant_name": "name if found"}',
            temperature: 0.1,
            maxTokens: 50,
            parseJson: true
          },
          output: '_failure_analysis',
        }
      ],
      transitions: {
        success: 'check_custom_offer',
        error: 'no_results',
      }
    },

    // Decide whether to offer custom pickup
    check_custom_offer: {
      type: 'decision',
      description: 'Decide if we should offer custom pickup',
      conditions: [
        {
          expression: 'context._failure_analysis?.specific_restaurant === true',
          event: 'search_external', // First try Google Places search
        }
      ],
      transitions: {
        search_external: 'search_external_vendor', // NEW: Search Google Places first
        default: 'no_results',
      }
    },

    // NEW: Search Google Places for external vendor
    search_external_vendor: {
      type: 'action',
      description: 'Search Google Places for the restaurant not in our database',
      actions: [
        {
          id: 'external_search',
          executor: 'external_search',
          config: {
            query: '{{_failure_analysis.restaurant_name}}',
            location: '{{location.city || "Nashik"}}',
            type: 'restaurant',
            radius: 25000, // 25km radius
            lat: '{{location.lat}}',
            lng: '{{location.lng}}',
          },
          output: 'external_search_results',
        }
      ],
      transitions: {
        found: 'show_external_results',
        not_found: 'offer_custom_pickup',
        error: 'offer_custom_pickup',
      }
    },

    // NEW: Show external search results
    show_external_results: {
      type: 'wait',
      description: 'Display Google Places results to user',
      actions: [
        {
          id: 'display_external',
          executor: 'response',
          config: {
            message: '{{external_search_results.chatMessage}}',
            dynamicMetadata: {
              cards: 'external_search_results.cards'
            }
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'handle_external_selection',
        select_external: 'confirm_external_pickup', // Direct selection from card
      }
    },

    // NEW: Handle external vendor selection
    handle_external_selection: {
      type: 'action',
      description: 'Parse user selection from external results',
      actions: [
        {
          id: 'parse_external_selection',
          executor: 'llm',
          config: {
            systemPrompt: 'Extract which external vendor the user selected. Results: {{external_search_results.places}}',
            prompt: 'User said: "{{user_message}}". Which vendor did they select? Return JSON: {"selected_index": 0, "vendor_name": "name", "selected": true/false}',
            temperature: 0.1,
            maxTokens: 80,
            parseJson: true
          },
          output: '_external_selection',
        }
      ],
      transitions: {
        success: 'check_external_selection',
        error: 'show_external_results',
      }
    },

    // NEW: Check if user made a valid selection
    check_external_selection: {
      type: 'decision',
      description: 'Validate external selection',
      conditions: [
        {
          expression: 'context._external_selection?.selected === true',
          event: 'selected',
        }
      ],
      transitions: {
        selected: 'confirm_external_pickup',
        default: 'offer_custom_pickup', // Fallback to manual pickup offer
      }
    },

    // NEW: Confirm pickup from external vendor
    confirm_external_pickup: {
      type: 'action',
      description: 'Set up custom pickup from selected external vendor',
      actions: [
        {
          id: 'set_external_vendor',
          executor: 'response',
          config: {
            saveToContext: {
              'is_custom_order': true,
              'is_external_vendor': true,
              'external_vendor_name': '{{external_search_results.topResult.name || _external_selection.vendor_name}}',
              'external_vendor_address': '{{external_search_results.topResult.address}}',
              'external_vendor_location': {
                'lat': '{{external_search_results.topResult.lat}}',
                'lng': '{{external_search_results.topResult.lng}}'
              },
              'maps_link': '{{external_search_results.topResult.mapsLink}}',
              'custom_pickup_location': {
                'name': '{{external_search_results.topResult.name}}',
                'address': '{{external_search_results.topResult.address}}',
                'lat': '{{external_search_results.topResult.lat}}',
                'lng': '{{external_search_results.topResult.lng}}'
              }
            }
          }
        },
        {
          id: 'confirm_external_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are confirming a pickup order. Be enthusiastic and brief.',
            prompt: `Great choice! User selected {{external_vendor_name || external_search_results.topResult.name}}.
Address: {{external_vendor_address || external_search_results.topResult.address}}
Distance: {{external_search_results.topResult.distance || "nearby"}}

Tell them we'll send a rider to pick up their order. Ask what specific items they want from this place.`,
            temperature: 0.7,
            maxTokens: 120,
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'collect_external_order_items',
      }
    },

    // NEW: Collect items for external order
    collect_external_order_items: {
      type: 'action',
      description: 'Record what items user wants from external vendor',
      actions: [
        {
          id: 'save_items',
          executor: 'response',
          config: {
            saveToContext: {
              'custom_item_details': '{{user_message}}'
            }
          }
        }
      ],
      transitions: {
        success: 'collect_address', // Continue to normal address collection
      }
    },

    // Offer custom pickup (Parcel service fallback)
    offer_custom_pickup: {
      type: 'wait',
      description: 'Offer to pick up from the specific restaurant via parcel service',
      actions: [
        {
          id: 'offer_custom_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are a helpful assistant. The user wanted food from a specific place we don\'t partner with.',
            prompt: `User wanted: {{extracted_food.search_query}}.
Restaurant "{{_failure_analysis.restaurant_name}}" is not in our partner list.
However, offer to send a rider to pick up the order if they place it directly with the restaurant.
Ask: "Would you like me to send a rider to pick it up for you?"`,
            temperature: 0.7,
            maxTokens: 100,
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'handle_custom_pickup_response',
      }
    },

    // Handle user response to custom pickup offer
    handle_custom_pickup_response: {
      type: 'decision',
      description: 'Check if user wants custom pickup',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("yes") || context._user_message?.toLowerCase().includes("sure") || context._user_message?.toLowerCase().includes("please")',
          event: 'accepted',
        }
      ],
      transitions: {
        accepted: 'collect_custom_pickup_details',
        default: 'no_results', // If they say no, just show generic alternatives
      }
    },

    // Collect Custom Pickup Details
    collect_custom_pickup_details: {
      type: 'wait',
      description: 'Ask for pickup location details',
      actions: [
        {
          id: 'ask_pickup_details',
          executor: 'llm',
          config: {
            systemPrompt: 'You are arranging a custom pickup.',
            prompt: 'Ask for the pickup location (Restaurant Name & Area) and what item they are ordering. Be brief.',
            temperature: 0.6,
            maxTokens: 80,
          },
          output: '_last_response',
        }
      ],
      transitions: {
        user_message: 'extract_custom_pickup',
      }
    },

    // Extract Custom Pickup Details
    extract_custom_pickup: {
      type: 'action',
      description: 'Extract pickup location',
      actions: [
        {
          id: 'extract_pickup_loc',
          executor: 'address', // Use address executor to resolve location
          config: {
            field: 'custom_pickup_location',
            prompt: 'Resolving pickup location...',
            useUserMessage: true, 
          },
          output: 'custom_pickup_location',
        },
        {
          id: 'set_custom_flag',
          executor: 'response',
          config: {
            saveToContext: {
              'is_custom_order': true,
              'custom_item_details': '{{extracted_food.search_query}}' // Default to search query
            }
          }
        }
      ],
      transitions: {
        address_valid: 'collect_address', // Reuse standard address collection for drop
        error: 'collect_custom_pickup_details', // Retry
      }
    },

    // Show search results
    show_results: {
      type: 'wait',
      description: 'Display food items to user and wait for selection',
      onEntry: [
        {
          id: 'display_items',
          executor: 'response',
          config: {
            message: 'Here are some delicious options I found for you:',
            dynamicMetadata: {
              cards: 'search_results.cards'
            }
          },
          output: '_last_response',
        },
      ],
      actions: [],
      transitions: {
        user_message: 'process_selection',
      },
    },

    // Process item selection
    process_selection: {
      type: 'action',
      description: 'Parse selected items and quantities using selection executor',
      actions: [
        {
          id: 'parse_selection',
          executor: 'selection',
          config: {
            // Selection executor will parse user message and match against search_results
          },
          output: 'selection_result',
        },
      ],
      transitions: {
        item_selected: 'add_to_cart',
        checkout: 'check_auth_for_checkout',
        cancel: 'check_trigger',
        search_more: 'search_food',
        search_items: 'search_requested_items', // User requested specific items not in results
        unclear: 'clarify_selection',
        error: 'show_results',
      },
    },

    // Search for specific items user requested
    search_requested_items: {
      type: 'action',
      description: 'Search for specific items user requested that were not in current results',
      actions: [
        {
          id: 'update_query',
          executor: 'response',
          config: {
            save_to_context: {
              'extracted_food.search_query': '{{selection_result.searchSuggestion}}',
            },
          },
        },
        {
          id: 'search_items',
          executor: 'search',
          config: {
            query: '{{selection_result.searchSuggestion}}',
            type: 'food',
            limit: 10,
          },
          output: 'search_results',
        },
      ],
      transitions: {
        items_found: 'show_results',
        no_items: 'no_results',
        error: 'show_results',
      },
    },

    // Clarify unclear selection
    clarify_selection: {
      type: 'wait', // Changed from 'action' to wait for user input
      description: 'Ask user to clarify their selection',
      actions: [
        {
          id: 'clarify_prompt',
          executor: 'response',
          config: {
            message: 'I didn\'t quite understand your selection. Please:\n- Type a number (1, 2, 3) to select an item\n- Type "Add [item name] to cart"\n- Or say "checkout" when ready',
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'process_selection',
      },
    },

    // Add items to cart
    add_to_cart: {
      type: 'wait', // Wait for user input after showing cart confirmation
      description: 'Add selected items to cart',
      onEntry: [
        {
          id: 'confirm_cart',
          executor: 'response',
          config: {
            message: `✅ Added to cart!\n\n🛒 {{selection_result.selectedItems.0.itemName}} x{{selection_result.selectedItems.0.quantity}} - ₹{{selection_result.totalPrice}}\n\nAdd more items or say "checkout" when ready.`,
            responseType: 'cart_update',
            // Save the selected item to cart AND selected_items (for distance/pricing)
            saveToContext: {
              cart_items: '{{selection_result.selectedItems}}',
              selected_items: '{{selection_result.selectedItems}}',
            },
          },
          output: '_last_response',
        },
      ],
      actions: [],
      transitions: {
        user_message: 'process_selection',
      },
    },

    // Check authentication before checkout
    check_auth_for_checkout: {
      type: 'decision',
      description: 'Check if user is authenticated before checkout',
      conditions: [
        {
          expression: 'context.user_authenticated === true',
          event: 'authenticated',
        },
      ],
      transitions: {
        authenticated: 'collect_address',
        default: 'request_phone',
      },
    },

    // Request phone for authentication
    request_phone: {
      type: 'wait',
      description: 'Ask user for phone number to authenticate',
      onEntry: [
        {
          id: 'ask_phone',
          executor: 'response',
          config: {
            message: 'To complete your order, please provide your phone number for verification.',
            responseType: 'request_phone',
          },
          output: '_last_response',
        },
      ],
      actions: [],
      transitions: {
        phone_provided: 'verify_otp',
        user_message: 'parse_phone',
      },
    },

    // Parse phone from user message
    parse_phone: {
      type: 'action',
      description: 'Extract phone number from user message',
      actions: [
        {
          id: 'validate_phone_action',
          executor: 'auth',
          config: {
            action: 'validate_phone',
            input: '{{_user_message}}',
          },
          output: 'phone_result',
        },
      ],
      transitions: {
        valid: 'send_otp',
        invalid: 'request_phone',
        cancel: 'cancelled',
        error: 'request_phone',
      },
    },

    // Send OTP
    send_otp: {
      type: 'action',
      description: 'Send OTP to user phone',
      actions: [
        {
          id: 'send_otp_action',
          executor: 'auth',
          config: {
            action: 'send_otp',
          },
          output: 'otp_result',
        },
        {
          id: 'otp_sent_message',
          executor: 'response',
          config: {
            message: 'We\'ve sent an OTP to your phone. Please enter it to continue.',
            responseType: 'request_otp',
          },
          output: '_last_response',
        },
      ],
      transitions: {
        success: 'verify_otp',
        otp_sent: 'verify_otp',
        error: 'otp_error',
      },
    },

    // Verify OTP
    verify_otp: {
      type: 'wait',
      description: 'Wait for user to enter OTP',
      actions: [],
      transitions: {
        user_message: 'check_otp',
      },
    },

    // Check OTP
    check_otp: {
      type: 'action',
      description: 'Verify the OTP entered by user',
      actions: [
        {
          id: 'verify_otp_action',
          executor: 'auth',
          config: {
            action: 'verify_otp',
            otp: '{{_user_message}}',
          },
          output: 'otp_verify_result',
        },
      ],
      transitions: {
        valid: 'collect_address',
        otp_valid: 'collect_address',
        invalid: 'otp_retry',
        otp_invalid: 'otp_retry',
        error: 'otp_error',
      },
    },

    // OTP retry
    otp_retry: {
      type: 'action',
      description: 'Ask user to re-enter OTP',
      actions: [
        {
          id: 'otp_retry_message',
          executor: 'response',
          config: {
            message: 'That OTP doesn\'t seem right. Please try again or type "resend" to get a new OTP.',
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_otp_or_resend',
      },
    },

    // Check if user wants to resend or entered new OTP
    check_otp_or_resend: {
      type: 'decision',
      description: 'Check if user wants to resend OTP',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("resend")',
          event: 'resend',
        },
      ],
      transitions: {
        resend: 'send_otp',
        default: 'check_otp',
      },
    },

    // OTP error
    otp_error: {
      type: 'action',
      description: 'Handle OTP error',
      actions: [
        {
          id: 'otp_error_message',
          executor: 'response',
          config: {
            message: 'Sorry, there was an issue with OTP verification. Please try again.',
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'request_phone',
      },
    },

    // Confirm selected items
    confirm_selection: {
      type: 'action',
      description: 'Show cart and ask for confirmation',
      actions: [
        {
          id: 'show_cart',
          executor: 'llm',
          config: {
            systemPrompt: 'You are showing the cart. List items, quantities, prices, and total.',
            prompt: `Show the cart summary:
Items in cart: {{selected_items.length}}
Total items value: ₹{{pricing.itemsTotal}}

Ask if they want to:
1. Proceed to checkout
2. Add more items
3. Cancel order`,
            temperature: 0.7,
            maxTokens: 200,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_cart_action',
      },
    },

    // Check what user wants to do with cart
    check_cart_action: {
      type: 'decision',
      description: 'Determine next step based on user response',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("proceed") || context._user_message?.toLowerCase().includes("checkout") || context._user_message?.toLowerCase().includes("yes")',
          event: 'proceed_checkout',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("more") || context._user_message?.toLowerCase().includes("add")',
          event: 'add_more',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("cancel")',
          event: 'cancel_order',
        },
      ],
      transitions: {
        proceed_checkout: 'upsell_offer',
        add_more: 'search_food',
        cancel_order: 'cancelled',
        default: 'confirm_selection',
      },
    },

    // Upsell Offer
    upsell_offer: {
      type: 'action',
      description: 'Suggest add-ons',
      actions: [
        {
          id: 'suggest_addon',
          executor: 'llm',
          config: {
            systemPrompt: 'You are a helpful waiter. Suggest a drink or dessert to go with the order. Be brief.',
            prompt: 'User ordered {{selected_items.length}} items. Suggest a Coke, Lassi, or Gulab Jamun. Ask "Would you like to add a dessert or drink?"',
            temperature: 0.6,
            maxTokens: 80,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'handle_upsell',
      },
    },

    // Handle Upsell Response
    handle_upsell: {
      type: 'decision',
      description: 'Check if user accepted upsell',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("no") || context._user_message?.toLowerCase().includes("skip")',
          event: 'declined',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("yes") || context._user_message?.toLowerCase().includes("add")',
          event: 'accepted',
        }
      ],
      transitions: {
        declined: 'collect_address',
        accepted: 'add_upsell_item', // Simplified: In real app, would search/add specific item
        default: 'collect_address',
      },
    },

    // Add Upsell Item (Mock)
    add_upsell_item: {
      type: 'action',
      description: 'Add the suggested item',
      actions: [
        {
          id: 'add_mock_item',
          executor: 'llm', // Using LLM to acknowledge for now
          config: {
            systemPrompt: 'Acknowledge addition.',
            prompt: 'Say "Great choice! Added to your order." and proceed.',
            temperature: 0.5,
            maxTokens: 30,
          },
          output: '_last_response',
        }
      ],
      transitions: {
        next: 'collect_address', // Auto transition not supported by 'action' type usually, need user input or 'pass'
        // Assuming action type waits for user input unless it's a 'logic' type. 
        // Let's assume we just move to collect_address after sending the message? 
        // The flow engine might need a 'pass' transition or 'auto'.
        // Looking at existing states, they all wait for 'user_message' or 'success'.
        // I'll use 'success' if the executor returns.
        success: 'collect_address',
      },
    },

    // Collect delivery address
    collect_address: {
      type: 'wait',
      description: 'Get delivery address',
      onEntry: [
        {
          id: 'get_address_onentry',
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

    // Validate delivery zone
    validate_zone: {
      type: 'action',
      description: 'Check if address is in service area',
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
        zone_valid: 'check_distance_type', // Changed from calculate_distance
        zone_invalid: 'out_of_zone',
      },
    },

    // Check which distance calculation to use
    check_distance_type: {
      type: 'decision',
      description: 'Route to correct distance calculation',
      conditions: [
        {
          expression: 'context.is_custom_order === true',
          event: 'custom',
        }
      ],
      transitions: {
        custom: 'calculate_custom_distance',
        default: 'calculate_distance',
      }
    },

    // Calculate custom distance (for custom pickup)
    calculate_custom_distance: {
      type: 'action',
      description: 'Calculate distance for custom pickup',
      actions: [
        {
          id: 'get_custom_distance',
          executor: 'distance',
          config: {
            fromLatPath: 'custom_pickup_location.lat',
            fromLngPath: 'custom_pickup_location.lng',
            toLatPath: 'delivery_address.lat',
            toLngPath: 'delivery_address.lng',
          },
          output: 'distance',
          retryOnError: true,
          maxRetries: 2,
        },
      ],
      transitions: {
        calculated: 'calculate_custom_pricing',
        error: 'distance_error',
      },
    },

    // Calculate custom pricing (Parcel rates)
    calculate_custom_pricing: {
      type: 'action',
      description: 'Calculate pricing for custom pickup (Parcel rates)',
      actions: [
        {
          id: 'get_custom_pricing',
          executor: 'pricing',
          config: {
            type: 'parcel', // Use parcel pricing for custom orders
            distancePath: 'distance',
            minimumFare: 40,
            perKmRate: 12,
            taxRate: 0.05,
          },
          output: 'pricing',
        },
      ],
      transitions: {
        calculated: 'show_custom_summary',
      },
    },

    // Show custom order summary
    show_custom_summary: {
      type: 'action',
      description: 'Show summary for custom pickup',
      actions: [
        {
          id: 'custom_summary_msg',
          executor: 'llm',
          config: {
            systemPrompt: 'Show custom pickup summary. Be clear this is a delivery-only service.',
            prompt: `Summary:
Pickup: {{custom_pickup_location.label}}
Drop: {{delivery_address.label}}
Item: {{custom_item_details}}
Distance: {{distance}} km
Delivery Fee: ₹{{pricing.total}}

Note: You need to pay the restaurant directly. We only charge for delivery.
Reply "confirm" to book the rider.`,
            temperature: 0.7,
            maxTokens: 200,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_final_confirmation', // Reuse existing confirmation logic
      },
    },

    // Calculate distance (from restaurant to delivery)
    calculate_distance: {
      type: 'action',
      description: 'Calculate delivery distance',
      actions: [
        {
          id: 'get_distance',
          executor: 'distance',
          config: {
            // Use storeLat/storeLng from cart_items (saved during add_to_cart)
            fromLatPath: 'cart_items.0.storeLat',
            fromLngPath: 'cart_items.0.storeLng',
            // delivery_address uses latitude/longitude not lat/lng
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

    // Calculate total pricing
    calculate_pricing: {
      type: 'action',
      description: 'Calculate food order pricing',
      actions: [
        {
          id: 'get_pricing',
          executor: 'pricing',
          config: {
            type: 'food',
            itemsPath: 'selected_items',
            distancePath: 'distance',
            deliveryPerKm: 10,
            taxRate: 0.05,
          },
          output: 'pricing',
        },
      ],
      transitions: {
        calculated: 'collect_payment_method',
      },
    },

    // Collect Payment Method
    collect_payment_method: {
      type: 'wait',
      description: 'Ask for payment method',
      actions: [
        {
          id: 'ask_payment',
          executor: 'llm',
          config: {
            systemPrompt: 'You are collecting payment preference.',
            prompt: 'Ask how they would like to pay: "Cash on Delivery" or "Online Payment" (UPI/Card).',
            temperature: 0.7,
            maxTokens: 100,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'extract_payment_method',
      },
    },

    // Extract Payment Method
    extract_payment_method: {
      type: 'action',
      description: 'Extract payment method from user response',
      actions: [
        {
          id: 'extract_payment',
          executor: 'llm',
          config: {
            systemPrompt: 'Extract payment method. Return "COD" or "ONLINE".',
            prompt: 'User message: {{user_message}}\n\nReturn JSON: {"method": "COD" | "ONLINE"}',
            temperature: 0.1,
            maxTokens: 50,
          },
          output: 'payment_details',
        },
      ],
      transitions: {
        success: 'show_order_summary',
      },
    },

    // Show final order summary
    show_order_summary: {
      type: 'wait',
      description: 'Display complete order summary',
      onEntry: [
        {
          id: 'summary_message',
          executor: 'llm',
          config: {
            systemPrompt: 'You are showing a food order summary. Be clear about items, prices, and delivery details.',
            prompt: `Create order summary:
📦 Items: {{selected_items.length}} items
💰 Items Total: ₹{{pricing.itemsTotal}}
🚚 Delivery Fee: ₹{{pricing.deliveryFee}} ({{distance}}km)
🧾 GST (5%): ₹{{pricing.tax}}
💳 Total: ₹{{pricing.total}}
💸 Payment: {{payment_details.method}}

📍 Delivery to: {{delivery_address.label}}
⏱️ Estimated time: 30-45 minutes

Reply "confirm" to place order or "cancel" to cancel.`,
            temperature: 0.7,
            maxTokens: 250,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'check_final_confirmation',
      },
    },

    // Check final confirmation
    check_final_confirmation: {
      type: 'decision',
      description: 'Evaluate final confirmation',
      conditions: [
        {
          expression: 'context._user_message?.toLowerCase().includes("confirm") || context._user_message?.toLowerCase().includes("yes")',
          event: 'user_confirms',
        },
        {
          expression: 'context._user_message?.toLowerCase().includes("cancel") || context._user_message?.toLowerCase().includes("no")',
          event: 'user_cancels',
        },
      ],
      transitions: {
        user_confirms: 'check_order_type_final', // Changed from place_order
        user_cancels: 'cancelled',
        default: 'show_order_summary',
      },
    },

    // Check order type before placing
    check_order_type_final: {
      type: 'decision',
      description: 'Route to correct order placement',
      conditions: [
        {
          expression: 'context.is_custom_order === true',
          event: 'custom',
        }
      ],
      transitions: {
        custom: 'place_custom_order',
        default: 'place_order',
      }
    },

    // Place custom order
    place_custom_order: {
      type: 'action',
      description: 'Create custom pickup order',
      actions: [
        {
          id: 'create_custom_order',
          executor: 'order',
          config: {
            type: 'parcel', // Treat as parcel
            pickupAddressPath: 'custom_pickup_location',
            deliveryAddressPath: 'delivery_address',
            pricingPath: 'pricing',
            detailsPath: 'custom_item_details', // Pass item name as details
            isCustomFood: true,
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

    // Place order
    place_order: {
      type: 'action',
      description: 'Create food order in backend',
      actions: [
        {
          id: 'create_order',
          executor: 'order',
          config: {
            type: 'food',
            itemsPath: 'selected_items',
            addressPath: 'delivery_address',
            paymentPath: 'payment_details',
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
      description: 'Order successfully placed',
      actions: [
        {
          id: 'success_message',
          executor: 'llm',
          config: {
            systemPrompt: 'Confirm successful food order placement. Be enthusiastic!',
            prompt: `Confirm order:
✅ Order ID: {{order_result.orderId}}
💰 Total: ₹{{pricing.total}}
📍 Delivery: {{delivery_address.label}}
⏱️ ETA: 30-45 minutes

Tell them they'll receive live updates on WhatsApp and can track their order.`,
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
      type: 'wait',
      description: 'No food items found',
      actions: [
        {
          id: 'fetch_categories',
          executor: 'search',
          config: {
            type: 'categories',
            index: 'food_items',
            limit: 8
          },
          output: 'popular_categories'
        },
        {
          id: 'no_results_message',
          executor: 'llm',
          config: {
            systemPrompt: 'Apologize for no results and suggest alternatives.',
            prompt: `I couldn't find anything matching "{{user_message}}".
{{#if userPreferenceContext}}
Based on your preferences, maybe try searching for: Veg Pizza, Paneer Tikka, or Veg Biryani.
{{else}}
{{#if popular_categories}}
Here are some popular options you might like:
{{#each popular_categories}}
- {{this}}
{{/each}}
{{else}}
Suggest popular categories like pizza, biryani, chinese, burgers, etc.
{{/if}}
{{/if}}
Ask what else they'd like to try.`,
            temperature: 0.8,
            maxTokens: 150,
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
      description: 'Failed to get valid address',
      actions: [
        {
          id: 'error_message',
          executor: 'response',
          config: {
            message: 'Sorry, we couldn\'t understand your delivery address. Please try ordering again.',
          },
        },
      ],
      transitions: {},
    },

    out_of_zone: {
      type: 'end',
      description: 'Delivery location outside service area',
      actions: [
        {
          id: 'zone_error',
          executor: 'response',
          config: {
            message: 'Sorry, we don\'t deliver to this location yet. We currently serve Nashik city. We\'ll notify you when we expand!',
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
            message: 'Sorry, we encountered an error calculating delivery distance. Please try again.',
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
            message: 'Sorry, we couldn\'t place your order right now. Please try again in a few minutes.',
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
            message: 'No worries! Your order has been cancelled. Come back when you\'re hungry! 🍕',
          },
        },
      ],
      transitions: {},
    },
  },

  initialState: 'check_trigger',
  finalStates: ['completed', 'cancelled', 'address_error', 'out_of_zone', 'distance_error', 'order_failed'],
};
