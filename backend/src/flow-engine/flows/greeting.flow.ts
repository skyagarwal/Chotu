/**
 * Greeting Flow - First User Interaction
 * 
 * This flow handles the initial greeting and introduces the platform.
 * Based on CONVERSATION_FLOW_SCRIPT.md - Act 1: Welcome & Greeting
 * 
 * ✨ NEW: Uses enhanced context for personalized greetings:
 * - Weather-aware messages (hot/cold/rainy)
 * - Meal-time suggestions (breakfast, lunch, dinner)
 * - Festival greetings (Diwali, Holi, etc.)
 * - Local Nashik knowledge
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
            prompt: `Generate a very short welcome message for Mangwale (Nashik's Super App).

{{#if festival.isToday}}
🎉 TODAY IS {{festival.name}}! Wish the user.
{{/if}}

{{#if weather}}
Current weather: {{weather.temperature}}°C, {{weather.condition}}
{{#if weather.isHot}}It's hot - suggest refreshing drinks{{/if}}
{{#if weather.isCold}}It's cold - suggest warm food{{/if}}
{{#if weather.isRainy}}It's rainy - perfect for snacks{{/if}}
{{/if}}

{{#if mealTime}}
It's {{mealTime}} time.
{{/if}}

{{#if authenticated}}
{{#if userPreferenceContext}}
USER CONTEXT (use this to personalize):
{{{userPreferenceContext}}}

If returning customer with favorite store, mention it: "Welcome back! Order from [store] again?"
{{/if}}
{{#if user_name}}Welcome back, {{user_name}}!{{/if}}
{{else}}
New user - greet warmly in English and ask how you can help.
{{/if}}

Keep it under 25 words. Be friendly. Respond in ENGLISH.`,
            systemPrompt: "You are Chotu, Mangwale's friendly AI assistant. Be warm, helpful. Respond in ENGLISH unless user writes in Hindi.",
            temperature: 0.6,
            maxTokens: 100
          },
          output: 'greeting_text',
        },
        {
          id: 'greeting_message',
          executor: 'response',
          config: {
            message: "{{greeting_text}}",
            buttons: [
              { id: 'btn_food', label: '🍔 Order Food', value: 'order_food' },
              { id: 'btn_parcel', label: '📦 Send Parcel', value: 'parcel_booking' },
              { id: 'btn_shop', label: '🛒 Shop Online', value: 'search_product' },
              { id: 'btn_help', label: '❓ Help', value: 'help' }
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
    updatedAt: '2025-12-25',
    tags: ['greeting', 'welcome', 'onboarding', 'contextual'],
    priority: 100,
  },
};
