import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../services/base-agent.service';
import { AgentContext, AgentConfig, AgentType, FunctionDefinition, ModuleType } from '../types/agent.types';

/**
 * Complaints Agent
 * 
 * Handles customer complaints with empathy and appropriate compensation
 */
@Injectable()
export class ComplaintsAgent extends BaseAgent {
  getConfig(): AgentConfig {
    return {
      id: 'complaints-agent',
      type: AgentType.COMPLAINTS,
      name: 'Complaints Agent',
      description: 'Handles customer complaints and quality issues',
      modules: [ModuleType.FOOD, ModuleType.ECOM, ModuleType.GROCERY, ModuleType.PHARMACY, ModuleType.PARCEL],
      systemPrompt: '', // Set dynamically
      temperature: 0.3, // More deterministic for complaints
      maxTokens: 2000,
      functions: this.getFunctions(),
      enabled: true,
    };
  }

  getSystemPrompt(context: AgentContext): string {
    const { getPersonalityPrompt } = require('../config/personality.config');
    const basePrompt = getPersonalityPrompt(context.module);

    return `${basePrompt}

COMPLAINT HANDLING ROLE:
You are a customer support specialist handling complaints.

Your goals:
1. Show genuine empathy and understanding
2. Assess the issue objectively (use image analysis if image provided)
3. Offer appropriate compensation based on severity
4. Maintain brand reputation
5. Turn unhappy customers into loyal ones

Compensation Guidelines:
- Food Quality Score < 3: Full refund + ₹200 voucher + apology
- Food Quality Score 3-5: 50% refund + ₹100 voucher + apology
- Food Quality Score > 5: Sincere apology + ₹50 voucher + explain standards
- Delivery issues: ₹50-100 voucher based on delay
- Wrong items: Full refund + reship correct items
- Damaged items: Full refund or replacement

Important:
- Always be apologetic and understanding
- Never blame the customer
- Take ownership of the problem
- Act quickly to resolve
- Follow up to ensure satisfaction

Current order: ${context.session?.order_id || 'Unknown'}
Order amount: ₹${context.session?.order_amount || 0}`;
  }

  getFunctions(): FunctionDefinition[] {
    return [
      {
        name: 'analyze_food_image',
        description: 'Analyze food quality from image to assess complaint objectively',
        parameters: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: 'URL of the food image uploaded by user',
            },
            dish_type: {
              type: 'string',
              description: 'Type of dish (e.g., "pizza", "biryani")',
            },
          },
          required: ['image_url'],
        },
      },
      {
        name: 'process_refund',
        description: 'Process refund for an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Order ID to refund',
            },
            amount: {
              type: 'number',
              description: 'Refund amount in rupees',
            },
            reason: {
              type: 'string',
              description: 'Reason for refund',
              enum: [
                'poor_quality',
                'wrong_item',
                'delayed_delivery',
                'damaged_item',
                'other',
              ],
            },
          },
          required: ['order_id', 'amount', 'reason'],
        },
      },
      {
        name: 'generate_voucher',
        description: 'Generate compensation voucher for customer',
        parameters: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Voucher amount in rupees',
            },
            validity_days: {
              type: 'number',
              description: 'Voucher validity in days (default: 30)',
            },
          },
          required: ['amount'],
        },
      },
      {
        name: 'check_order_status',
        description: 'Check current status of an order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Order ID to check',
            },
          },
          required: ['order_id'],
        },
      },
    ];
  }
}
