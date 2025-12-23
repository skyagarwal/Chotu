/**
 * Help Flow - User Asks for Assistance
 * 
 * Handles help requests and explains available services
 */

import { FlowDefinition } from '../types/flow.types';

export const helpFlow: FlowDefinition = {
  id: 'help_v1',
  name: 'Help Flow',
  description: 'Explain services and features when user asks for help',
  version: '1.0.0',
  trigger: 'help|browse_menu|what can you do|show me|features|services|options|menu|service_inquiry', // Added multiple triggers
  module: 'general',
  enabled: true,
  initialState: 'show_help',
  finalStates: ['completed'],

  states: {
    show_help: {
      type: 'action',
      description: 'Show help and available services',
      actions: [
        {
          id: 'help_message',
          executor: 'response',
          config: {
            message: "Here are the services I can help you with. Please select an option below:",
            cards: [
              {
                id: 'card_food',
                name: 'Food Delivery',
                description: 'Order from top restaurants near you.',
                image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
                action: { label: 'Order Food', value: 'order_food' }
              },
              {
                id: 'card_parcel',
                name: 'Parcel Delivery',
                description: 'Send packages anywhere in the city instantly.',
                image: 'https://images.unsplash.com/photo-1566576912906-25433db48839?w=500&q=80',
                action: { label: 'Send Parcel', value: 'parcel_booking' }
              },
              {
                id: 'card_shop',
                name: 'Shopping',
                description: 'Find products from local stores and supermarkets.',
                image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80',
                action: { label: 'Shop Online', value: 'search_product' }
              },
              {
                id: 'card_support',
                name: 'Support',
                description: 'Get help with your orders and account.',
                image: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=500&q=80',
                action: { label: 'Contact Support', value: 'contact_support' }
              }
            ]
          },
          output: '_last_response',
        },
      ],
      transitions: {
        default: 'completed',
      },
    },

    completed: {
      type: 'end',
      description: 'Flow completed',
      transitions: {},
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-15',
    tags: ['help', 'features', 'services'],
    priority: 90,
  },
};
