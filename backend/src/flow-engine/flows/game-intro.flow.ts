/**
 * Game Introduction Flow - Gamification Hook
 * 
 * Based on CONVERSATION_FLOW_SCRIPT.md - Act 2: Introduce Rewards
 * Uses STRUCTURED responses (not LLM hallucination) for consistency
 * 
 * Industry Best Practice: Pre-defined buttons for clear user actions
 * (Used by WhatsApp Business, Intercom, Drift, Zendesk, etc.)
 */

import { FlowDefinition } from '../types/flow.types';

export const gameIntroFlow: FlowDefinition = {
  id: 'game_intro_v1',
  name: 'Gamification Master Flow',
  description: 'Unified flow for game introduction and gameplay',
  version: '2.1.0',
  trigger: 'earn|game|reward|play_game|play game|earn money|earn reward|make money|rewards program',
  module: 'general',
  enabled: true,
  initialState: 'introduce_rewards',
  finalStates: ['completed'],

  states: {
    // 1. Intro & Menu
    introduce_rewards: {
      type: 'action',
      actions: [
        {
          executor: 'response',
          config: {
            message: `Hey there! 👋 Welcome to the Mangwale AI assistant rewards system!

**Choose a game to play & earn ₹5-₹15:**

1. 🎯 **Intent Quest** - Guess what people mean
2. 🌍 **Language Master** - Detect languages
3. 😊 **Tone Detective** - Identify emotions
4. 📝 **Profile Builder** - Quick profile questions
5. 🏆 **View Leaderboard**

Reply with the number of your choice!`,
            buttons: [
              { id: 'btn_1', label: '🎯 Play Intent Quest', value: '1' },
              { id: 'btn_2', label: '🌍 Play Language Master', value: '2' },
              { id: 'btn_3', label: '😊 Play Tone Detective', value: '3' },
              { id: 'btn_4', label: '📝 Profile Builder', value: '4' },
              { id: 'btn_5', label: '🏆 Leaderboard', value: '5' }
            ]
          }
        }
      ],
      transitions: {
        user_message: 'handle_selection'
      }
    },

    // 2. Selection Logic
    handle_selection: {
      type: 'decision',
      conditions: [
        { expression: '_user_message == "1" || _user_message.toLowerCase().includes("intent")', event: 'intent_quest' },
        { expression: '_user_message == "2" || _user_message.toLowerCase().includes("language")', event: 'language_master' },
        { expression: '_user_message == "3" || _user_message.toLowerCase().includes("tone")', event: 'tone_detective' },
        { expression: '_user_message == "4" || _user_message.toLowerCase().includes("profile")', event: 'profile_builder' },
        { expression: '_user_message == "5" || _user_message.toLowerCase().includes("leaderboard")', event: 'leaderboard' }
      ],
      transitions: {
        intent_quest: 'start_intent_quest',
        language_master: 'start_language_master',
        tone_detective: 'start_tone_detective',
        profile_builder: 'start_profile_builder',
        leaderboard: 'show_leaderboard',
        default: 'invalid_selection'
      }
    },

    invalid_selection: {
      type: 'action',
      actions: [
        {
          executor: 'response',
          config: {
            message: '❌ Please select a valid option (1-5).'
          }
        }
      ],
      transitions: {
        default: 'introduce_rewards'
      }
    },

    // 3. Game Starters
    start_intent_quest: {
      type: 'action',
      actions: [
        {
          executor: 'game',
          config: { action: 'start', gameType: 'intent_quest' }
        }
      ],
      transitions: {
        user_message: 'game_loop'
      }
    },
    start_language_master: {
      type: 'action',
      actions: [
        {
          executor: 'game',
          config: { action: 'start', gameType: 'language_master' }
        }
      ],
      transitions: {
        user_message: 'game_loop'
      }
    },
    start_tone_detective: {
      type: 'action',
      actions: [
        {
          executor: 'game',
          config: { action: 'start', gameType: 'tone_detective' }
        }
      ],
      transitions: {
        user_message: 'game_loop'
      }
    },
    start_profile_builder: {
      type: 'action',
      actions: [
        {
          executor: 'game',
          config: { action: 'start', gameType: 'profile_builder' }
        }
      ],
      transitions: {
        user_message: 'game_loop'
      }
    },

    // 4. Game Loop
    game_loop: {
      type: 'action',
      actions: [
        {
          executor: 'game',
          config: { action: 'answer' }
        }
      ],
      transitions: {
        complete: 'game_finished', // Event from GameExecutor
        default: 'game_loop'       // Continue loop (next question)
      }
    },

    // 5. Game Finished
    game_finished: {
      type: 'action',
      actions: [
        {
          executor: 'response',
          config: {
            message: 'Would you like to play another game?',
            buttons: [
              { id: 'yes', label: 'Yes, Play More', value: 'yes' },
              { id: 'no', label: 'No, I am done', value: 'no' }
            ]
          }
        }
      ],
      transitions: {
        user_message: 'play_again_decision'
      }
    },

    play_again_decision: {
      type: 'decision',
      conditions: [
        { expression: '_user_message.toLowerCase().includes("yes")', event: 'yes' }
      ],
      transitions: {
        yes: 'introduce_rewards',
        default: 'completed'
      }
    },

    // 6. Leaderboard (Placeholder)
    show_leaderboard: {
      type: 'action',
      actions: [
        {
          executor: 'response',
          config: {
            message: '🏆 **Leaderboard**\n\n1. User123 - 5000 pts\n2. You - 0 pts\n\nStart playing to climb the ranks!'
          }
        }
      ],
      transitions: {
        default: 'introduce_rewards'
      }
    },

    completed: {
      type: 'end',
      actions: [],
      transitions: {}
    }
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-16',
    updatedAt: '2025-11-22',
    tags: ['gamification', 'rewards', 'earning', 'games', 'structured'],
    priority: 85,
    notes: 'Unified flow for game introduction and gameplay',
  },
};

