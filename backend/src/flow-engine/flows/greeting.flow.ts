/**
 * Greeting Flow - First User Interaction
 * 
 * This flow handles the initial greeting and introduces the platform.
 * Based on CONVERSATION_FLOW_SCRIPT.md - Act 1: Welcome & Greeting
 */

import { FlowDefinition } from '../types/flow.types';

export const greetingFlow: FlowDefinition = {
  id: 'greeting_v1',
  name: 'Greeting Flow',
  description: 'Welcome new users and introduce Mangwale platform',
  version: '1.0.0',
  trigger: 'greeting',
  module: 'general',
  enabled: true,
  initialState: 'welcome',
  finalStates: ['completed'],

  states: {
    // State 1: Welcome Message
    welcome: {
      type: 'action',
      description: 'Welcome user and introduce Mangwale',
      actions: [
        {
          id: 'generate_greeting',
          executor: 'llm',
          config: {
            prompt: `Generate a very short personalized welcome message for Mangwale (Nashik's Super App).

{{#if userPreferenceContext}}
USER CONTEXT (use this to personalize):
{{{userPreferenceContext}}}

If returning customer with favorite store, mention it: "Welcome back! Order from [store] again?"
If they have loyalty points > 100, mention: "You have [points] points to redeem!"
{{else}}
New user - just say: "Welcome to Mangwale! How can I help you today?"
{{/if}}

Keep it under 20 words. Be warm and friendly.`,
            systemPrompt: "You are Mangwale AI - Nashik's helpful super app assistant. Be professional, warm, and extremely brief.",
            temperature: 0.5,
            maxTokens: 60
          },
          output: 'greeting_text',
        },
        {
          id: 'greeting_message',
          executor: 'response',
          config: {
            message: "{{greeting_text}}",
            buttons: [
              { id: 'btn_food', label: 'Order Food', value: 'order_food' },
              { id: 'btn_parcel', label: 'Send Parcel', value: 'parcel_booking' },
              { id: 'btn_shop', label: 'Shop Online', value: 'search_product' },
              { id: 'btn_help', label: 'Help & Support', value: 'help' }
            ]
          },
          output: '_last_response',
        },
      ],
      transitions: {
        default: 'completed',
      },
    },

    // Final state - greeting completed, user should be routed to appropriate service flow
    completed: {
      type: 'end',
      description: 'Greeting completed - flow engine will route next message to appropriate service flow',
      transitions: {},
      metadata: {
        completionType: 'route_to_service',
        nextFlowSelection: 'auto', // Let flow engine detect intent and route
      },
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-15',
    tags: ['greeting', 'welcome', 'onboarding'],
    priority: 100,
  },
};
