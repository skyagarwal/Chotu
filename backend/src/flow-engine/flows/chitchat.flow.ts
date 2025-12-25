/**
 * Chitchat Flow - Casual Conversation
 * 
 * This flow handles casual conversation and social pleasantries.
 * Maintains engagement while subtly guiding users to core features.
 * 
 * ✨ NEW: Uses enhanced context for natural, contextual responses
 */

import { FlowDefinition } from '../types/flow.types';

export const chitchatFlow: FlowDefinition = {
  id: 'chitchat_v1',
  name: 'Chitchat Flow',
  description: 'Handles casual conversation (how are you, what\'s up, thank you, etc.)',
  version: '1.0.0',
  // Include Hindi/Hinglish variations, seasonal greetings, and pleasantries
  trigger: 'how are you|what\'s up|whats up|wassup|thank you|thanks|good job|nice|cool|awesome|great|amazing|wonderful|kaise hai|kaise ho|kaisa hai|kya haal|kya chal raha|theek ho|sab theek|chotu|re chotu|hey chotu|merry christmas|happy new year|happy diwali|happy holi|happy eid|shubh diwali|same to you|you too',
  module: 'general',
  enabled: true,
  initialState: 'respond_friendly',
  finalStates: ['completed'],

  states: {
    // State 1: Respond to chitchat
    respond_friendly: {
      type: 'action',
      description: 'Respond in a friendly, engaging manner',
      actions: [
        {
          id: 'chitchat_response',
          executor: 'llm',
          config: {
            systemPrompt: `You are Chotu, Mangwale's friendly AI assistant in Nashik.

PERSONALITY:
- Friendly, helpful, speaks Hinglish naturally
- Like a helpful local friend

RULES:
1. Reply in 1-2 sentences max
2. Acknowledge politely
3. Naturally mention something contextual when relevant
4. Guide toward: food order, parcel, or shopping
5. Use Hinglish if user used Hindi
6. Never discuss off-topic subjects`,
            prompt: `User said: {{message}}

{{#if festival.isToday}}
🎉 Today is {{festival.nameHindi}}! Include a warm festival greeting.
{{/if}}

{{#if weather}}
Weather: {{weather.temperature}}°C, {{weather.conditionHindi}}
{{#if weather.isHot}}Mention the heat casually.{{/if}}
{{#if weather.isCold}}Mention the cold casually.{{/if}}
{{#if weather.isRainy}}Mention the rain casually.{{/if}}
{{/if}}

Respond briefly and naturally. Guide them toward ordering something.`,
            temperature: 0.6,
            maxTokens: 150,
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'completed',
      },
    },

    // Final state
    completed: {
      type: 'end',
      description: 'Chitchat completed - ready for next user input',
      transitions: {},
      metadata: {
        completionType: 'continue_conversation',
        nextFlowSelection: 'auto',
      },
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-19',
    updatedAt: '2025-12-25',
    tags: ['chitchat', 'casual', 'social', 'pleasantries', 'contextual'],
    priority: 75,
  },
};
