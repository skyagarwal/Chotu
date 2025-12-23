import { FlowDefinition } from '../types/flow.types';

export const profileFlow: FlowDefinition = {
  id: 'profile_completion_v1',
  name: 'Profile Completion Flow',
  description: 'Collect user preferences to personalize the experience',
  version: '1.0.0',
  trigger: 'complete my profile|update profile|preferences|dietary|allergies',
  module: 'personalization',
  enabled: true,
  initialState: 'welcome',
  finalStates: ['end_state'],

  states: {
    welcome: {
      type: 'action',
      description: 'Welcome user to profile completion',
      actions: [
        {
          id: 'welcome_msg',
          executor: 'response',
          config: {
            message: "Great! Let's complete your profile so I can give you better recommendations. This will only take a minute.",
            buttons: [
              { id: 'start', label: "Let's Go", value: 'start' }
            ]
          },
          output: 'user_response'
        }
      ],
      transitions: {
        default: 'ask_dietary_type'
      }
    },

    ask_dietary_type: {
      type: 'action',
      description: 'Ask for dietary preference',
      actions: [
        {
          id: 'ask_diet',
          executor: 'response',
          config: {
            message: "First, what is your dietary preference?",
            buttons: [
              { id: 'veg', label: 'Vegetarian', value: 'veg' },
              { id: 'non_veg', label: 'Non-Vegetarian', value: 'non-veg' },
              { id: 'vegan', label: 'Vegan', value: 'vegan' },
              { id: 'eggetarian', label: 'Eggetarian', value: 'eggetarian' }
            ]
          },
          output: 'dietary_response'
        }
      ],
      transitions: {
        default: 'save_dietary_type'
      }
    },

    save_dietary_type: {
      type: 'action',
      description: 'Save dietary preference',
      actions: [
        {
          id: 'save_diet',
          executor: 'preference',
          config: {
            key: 'dietary_type',
            valuePath: 'dietary_response.value'
          }
        }
      ],
      transitions: {
        default: 'ask_allergies'
      }
    },

    ask_allergies: {
      type: 'action',
      description: 'Ask for allergies',
      actions: [
        {
          id: 'ask_allergy',
          executor: 'response',
          config: {
            message: "Do you have any food allergies?",
            buttons: [
              { id: 'none', label: 'None', value: 'none' },
              { id: 'peanuts', label: 'Peanuts', value: 'peanuts' },
              { id: 'dairy', label: 'Dairy', value: 'dairy' },
              { id: 'gluten', label: 'Gluten', value: 'gluten' }
            ]
          },
          output: 'allergy_response'
        }
      ],
      transitions: {
        default: 'save_allergies'
      }
    },

    save_allergies: {
      type: 'action',
      description: 'Save allergies',
      actions: [
        {
          id: 'save_allergy',
          executor: 'preference',
          config: {
            key: 'allergies',
            valuePath: 'allergy_response.value'
          }
        }
      ],
      transitions: {
        default: 'ask_cuisines'
      }
    },

    ask_cuisines: {
      type: 'action',
      description: 'Ask for favorite cuisines',
      actions: [
        {
          id: 'ask_cuisine',
          executor: 'response',
          config: {
            message: "What are your favorite cuisines?",
            buttons: [
              { id: 'indian', label: 'Indian', value: 'indian' },
              { id: 'chinese', label: 'Chinese', value: 'chinese' },
              { id: 'italian', label: 'Italian', value: 'italian' },
              { id: 'mexican', label: 'Mexican', value: 'mexican' }
            ]
          },
          output: 'cuisine_response'
        }
      ],
      transitions: {
        default: 'save_cuisines'
      }
    },

    save_cuisines: {
      type: 'action',
      description: 'Save cuisines',
      actions: [
        {
          id: 'save_cuisine',
          executor: 'preference',
          config: {
            key: 'favorite_cuisines',
            valuePath: 'cuisine_response.value'
          }
        }
      ],
      transitions: {
        default: 'ask_price_sensitivity'
      }
    },

    ask_price_sensitivity: {
      type: 'action',
      description: 'Ask for budget preference',
      actions: [
        {
          id: 'ask_budget',
          executor: 'response',
          config: {
            message: "What is your usual budget for meals?",
            buttons: [
              { id: 'budget', label: 'Budget Friendly', value: 'budget' },
              { id: 'moderate', label: 'Moderate', value: 'value' },
              { id: 'premium', label: 'Premium', value: 'premium' }
            ]
          },
          output: 'budget_response'
        }
      ],
      transitions: {
        default: 'save_price_sensitivity'
      }
    },

    save_price_sensitivity: {
      type: 'action',
      description: 'Save budget preference',
      actions: [
        {
          id: 'save_budget',
          executor: 'preference',
          config: {
            key: 'price_sensitivity',
            valuePath: 'budget_response.value'
          }
        }
      ],
      transitions: {
        default: 'completed'
      }
    },

    completed: {
      type: 'action',
      description: 'Completion message',
      actions: [
        {
          id: 'finish_msg',
          executor: 'response',
          config: {
            message: "Thanks! Your profile is updated. I'll use this to give you better recommendations.",
            cards: [
               {
                id: 'card_food',
                name: 'Order Food Now',
                description: 'See recommendations based on your profile.',
                image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
                action: { label: 'Order Food', value: 'order_food' }
              }
            ]
          }
        }
      ],
      transitions: {
        default: 'end_state'
      }
    },
    
    end_state: {
      type: 'end',
      description: 'Flow finished',
      transitions: {}
    }
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-15',
    tags: ['profile', 'personalization', 'onboarding'],
    priority: 100,
  },
};
