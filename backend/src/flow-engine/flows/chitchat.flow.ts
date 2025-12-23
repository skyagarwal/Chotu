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
            systemPrompt: `You are Mangwale AI. Be extremely concise (max 1 sentence).
        
        1. Acknowledge the user politely.
        2. Ask if they want to order food, send a parcel, or shop.`,
            prompt: '{{message}}',
            temperature: 0.6,
            maxTokens: 60,
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
