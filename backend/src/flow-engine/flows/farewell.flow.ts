/**
 * Farewell Flow - User Goodbye
 * 
 * This flow handles user farewells with polite goodbye messages.
 * Encourages users to return and hints at rewards for continued engagement.
 */

import { FlowDefinition } from '../types/flow.types';

export const farewellFlow: FlowDefinition = {
  id: 'farewell_v1',
  name: 'Farewell Flow',
  description: 'Handles user farewells with polite goodbye messages and return encouragement',
  version: '1.0.0',
  trigger: 'goodbye|bye|see you|later|farewell|cya|talk to you later|ttyl',
  module: 'general',
  enabled: true,
  initialState: 'send_farewell',
  finalStates: ['completed'],

  states: {
    // State 1: Send farewell message
    send_farewell: {
      type: 'action',
      description: 'Send goodbye message and encourage return',
      actions: [
        {
          id: 'farewell_message',
          executor: 'llm',
          config: {
            systemPrompt: `You are a friendly Mangwale AI assistant. The user is saying goodbye.
        
        Your response should:
        1. Warmly acknowledge their farewell
        2. Thank them for using Mangwale
        3. Remind them they can earn rewards anytime by playing games or ordering
        4. Encourage them to come back soon
        
        Keep it warm, brief, and positive (1-2 sentences).
        Make them feel valued and excited to return!`,
            prompt: '{{message}}',
            temperature: 0.7,
            maxTokens: 100,
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
      description: 'Farewell completed - session can be closed or continue if user sends another message',
      transitions: {},
      metadata: {
        completionType: 'session_end',
        allowNewConversation: true,
      },
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-19',
    tags: ['farewell', 'goodbye', 'closing'],
    priority: 80,
  },
};
