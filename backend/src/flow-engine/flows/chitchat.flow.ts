/**
 * Chitchat Flow - Casual Conversation
 * 
 * This flow handles casual conversation and social pleasantries.
 * Maintains engagement while subtly guiding users to core features.
 */

import { FlowDefinition } from '../types/flow.types';

export const chitchatFlow: FlowDefinition = {
  id: 'chitchat_v1',
  name: 'Chitchat Flow',
  description: 'Handles casual conversation (how are you, what\'s up, thank you, etc.)',
  version: '1.0.0',
  // Include Hindi/Hinglish variations: kaise hai, kya haal, kaise ho, kaisa hai
  trigger: 'how are you|what\'s up|whats up|wassup|thank you|thanks|good job|nice|cool|awesome|great|kaise hai|kaise ho|kaisa hai|kya haal|kya chal raha|theek ho|sab theek|chotu|re chotu|hey chotu',
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
            systemPrompt: `You are Mangwale AI, a helpful delivery assistant in Nashik.

RULES:
1. Reply in 1 sentence only
2. Acknowledge politely
3. Always guide toward: food order, parcel, or shopping
4. Use Hinglish if user used Hindi
5. Never discuss off-topic subjects

Example responses:
- "Sab badiya! 😊 Food order karein ya parcel bhejein?"
- "Thanks! Aapko kya chahiye - khana order karna hai?"
- "Main theek hoon! Aaj kya service chahiye?"`,
            prompt: '{{message}}',
            temperature: 0.5,
            maxTokens: 50,
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
    tags: ['chitchat', 'casual', 'social', 'pleasantries'],
    priority: 75,
  },
};
