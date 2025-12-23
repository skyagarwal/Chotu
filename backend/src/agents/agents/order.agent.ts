import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../services/base-agent.service';
import { LlmService } from '../../llm/services/llm.service';
import { FunctionExecutorService } from '../services/function-executor.service';
import { AgentType, ModuleType, AgentConfig, AgentContext, FunctionDefinition } from '../types/agent.types';

/**
 * Order Agent
 * 
 * Handles order-related queries:
 * - Track order status
 * - Cancel orders
 * - Modify order details
 * - Get order information
 * 
 * Works across ALL modules: food, ecom, parcel, ride, health, rooms, movies, services
 */
@Injectable()
export class OrderAgent extends BaseAgent {
  getConfig(): AgentConfig {
    return {
      id: 'order-agent',
      type: AgentType.ORDER,
      name: 'Order Agent',
      description: 'Handles order tracking, cancellation, and modifications',
      modules: [
        ModuleType.FOOD,
        ModuleType.ECOM,
        ModuleType.PARCEL,
        ModuleType.GROCERY,
        ModuleType.PHARMACY,
      ],
      systemPrompt: '', // Set dynamically
      temperature: 0.3,
      maxTokens: 1500,
      functions: this.getFunctions(),
      enabled: true,
    };
  }

  getSystemPrompt(context: AgentContext): string {
    const { getPersonalityPrompt } = require('../config/personality.config');
    const basePrompt = getPersonalityPrompt(context.module);

    return `${basePrompt}

ORDER MANAGEMENT ROLE:
You are an order management assistant.

Current user: ${context.phoneNumber}
Current module: ${context.module}

Your role:
- Help users start new orders (ask what they want and search for it)
- Handle "order_item:ID" requests by confirming the item and asking for quantity/variants if needed
- Help users track their orders
- Assist with order cancellations (within allowed timeframe)
- Help modify order details (delivery time, address, etc.)
- Retrieve user's saved addresses for delivery
- Provide clear order status updates
- Be empathetic if there are delays
- Escalate issues when needed

Available modules: food, ecom, parcel, ride, health, rooms, movies, services

Be professional, clear, and helpful. Always confirm actions before executing them.`;
  }

  getFunctions(): FunctionDefinition[] {
    return [
      {
        name: 'search_products',
        description: 'Search for products or restaurants to start a new order',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords',
            },
            module: {
              type: 'string',
              description: 'Target module (food, ecom, etc.)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_order_status',
        description: 'Check the status of an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'The order ID to check',
            },
            module: {
              type: 'string',
              description: 'The module (food, ecom, parcel, etc.)',
            },
          },
          required: ['order_id', 'module'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'The order ID to cancel',
            },
            module: {
              type: 'string',
              description: 'The module (food, ecom, parcel, etc.)',
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation',
            },
          },
          required: ['order_id', 'module'],
        },
      },
      {
        name: 'modify_order_time',
        description: 'Modify the delivery time of an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'The order ID to modify',
            },
            module: {
              type: 'string',
              description: 'The module (food, ecom, parcel, etc.)',
            },
            new_time: {
              type: 'string',
              description: 'The new delivery time',
            },
          },
          required: ['order_id', 'module', 'new_time'],
        },
      },
      {
        name: 'get_order_details',
        description: 'Get detailed information about an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'The order ID',
            },
            module: {
              type: 'string',
              description: 'The module (food, ecom, parcel, etc.)',
            },
          },
          required: ['order_id', 'module'],
        },
      },
      {
        name: 'validate_cart',
        description: 'Validate items in the cart and get updated pricing for the user\'s zone',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'List of items to validate',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  quantity: { type: 'number' },
                  variant_id: { type: 'string' }
                }
              }
            },
          },
          required: ['items'],
        },
      },
      {
        name: 'get_user_addresses',
        description: 'Get the user\'s saved addresses from their profile. Use this when the user wants to select a delivery address.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }
}
