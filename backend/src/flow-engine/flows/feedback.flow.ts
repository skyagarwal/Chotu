/**
 * Feedback Flow - User Satisfaction Collection
 * 
 * This flow collects user feedback and satisfaction ratings.
 * Critical for NLU data collection and service improvement.
 */

import { FlowDefinition } from '../types/flow.types';

export const feedbackFlow: FlowDefinition = {
  id: 'feedback_v1',
  name: 'Feedback Flow',
  description: 'Collects user feedback and satisfaction ratings',
  version: '1.0.0',
  trigger: 'feedback|suggestion|rate|review|complain|improve|problem|issue',
  module: 'general',
  enabled: true,
  initialState: 'ask_rating',
  finalStates: ['completed'],

  states: {
    // State 1: Ask for rating
    ask_rating: {
      type: 'wait',
      description: 'Ask user to rate their experience',
      actions: [
        {
          id: 'rating_prompt',
          executor: 'response',
          config: {
            message: "We'd love your feedback! 📊\n\nHow would you rate your experience with Mangwale?\n\n[BUTTON:Excellent 😄:1]\n[BUTTON:Good 🙂:2]\n[BUTTON:Okay 😐:3]\n[BUTTON:Poor 😞:4]",
            buttons: [
              { id: 'rate_1', label: 'Excellent 😄', value: '1' },
              { id: 'rate_2', label: 'Good 🙂', value: '2' },
              { id: 'rate_3', label: 'Okay 😐', value: '3' },
              { id: 'rate_4', label: 'Poor 😞', value: '4' }
            ]
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'ask_comment',
      },
      metadata: {
        collectInput: true,
        captureAs: 'rating',
      },
    },

    // State 2: Ask for detailed comment
    ask_comment: {
      type: 'wait',
      description: 'Collect detailed feedback comment',
      actions: [
        {
          id: 'comment_prompt',
          executor: 'response',
          config: {
            message: "Thank you! 🙏\n\nAny specific comments or suggestions?\n\n[BUTTON:Skip:skip]",
            buttons: [
              { id: 'skip_comment', label: 'Skip', value: 'skip' }
            ]
          },
          output: '_last_response',
        },
      ],
      transitions: {
        user_message: 'thank_you',
      },
      metadata: {
        collectInput: true,
        captureAs: 'comment',
        optional: true,
      },
    },

    // State 3: Thank user and complete
    thank_you: {
      type: 'action',
      description: 'Thank user for feedback',
      actions: [
        {
          id: 'gratitude_message',
          executor: 'response',
          config: {
            message: "Thank you so much for your feedback! 🌟\n\nYour input helps us improve our service. We truly appreciate you taking the time!\n\nIs there anything else I can help you with today?",
          },
          output: '_last_response',
        },
      ],
      transitions: {
        default: 'completed',
      },
    },

    // Final state
    completed: {
      type: 'end',
      description: 'Feedback completed',
      transitions: {},
      metadata: {
        completionType: 'feedback_collected',
        nextFlowSelection: 'auto',
      },
    },
  },

  contextSchema: {
    rating: {
      type: 'string',
      description: 'User rating (1-4)',
      required: true,
    },
    comment: {
      type: 'string',
      description: 'User feedback comment',
      required: false,
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-19',
    tags: ['feedback', 'rating', 'satisfaction', 'nlu-data'],
    priority: 70,
    dataCollection: true,
  },
};
