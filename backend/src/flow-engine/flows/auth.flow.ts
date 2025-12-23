/**
 * Authentication Flow - Unified Login & Registration
 * 
 * This flow handles all authentication steps:
 * - Phone number collection
 * - OTP sending and verification  
 * - Name collection (for new users)
 * - Email collection (for new users)
 * 
 * Centralizes auth logic previously scattered across:
 * - AgentOrchestratorService.handlePhoneNumberInput()
 * - AgentOrchestratorService.handleOtpInput()
 * - ConversationService.handleOtpVerification()
 */

import { FlowDefinition } from '../types/flow.types';

export const authFlow: FlowDefinition = {
  id: 'auth_v1',
  name: 'Authentication Flow',
  description: 'Unified login and registration flow with OTP verification',
  version: '1.0.0',
  trigger: 'login',
  module: 'general',
  enabled: true,
  initialState: 'check_auth_status',
  finalStates: ['auth_complete', 'auth_cancelled'],

  states: {
    // State 0: Check if already authenticated
    check_auth_status: {
      type: 'decision',
      description: 'Check if user is already authenticated',
      conditions: [
        {
          expression: 'context.authenticated === true || context.user_id',
          event: 'already_authenticated',
        },
        {
          expression: 'context.phone && context.phone.length >= 10',
          event: 'has_phone',
        },
        {
          expression: 'true', // default
          event: 'need_phone',
        },
      ],
      transitions: {
        already_authenticated: 'auth_complete',
        has_phone: 'send_otp',
        need_phone: 'collect_phone',
      },
    },

    // State 1: Collect Phone Number
    collect_phone: {
      type: 'wait',
      description: 'Ask user for phone number',
      onEntry: [
        {
          id: 'ask_phone',
          executor: 'response',
          config: {
            message: '📱 Please enter your 10-digit mobile number:\n\n(Example: 9923383838)',
          },
        },
      ],
      actions: [
        {
          id: 'validate_phone',
          executor: 'auth',
          config: {
            action: 'validate_phone',
            input: '{{_user_message}}',
          },
          output: 'phone_validation',
        },
      ],
      transitions: {
        valid: 'send_otp',
        invalid: 'collect_phone', // Re-ask
        cancel: 'auth_cancelled',
      },
    },

    // State 2: Send OTP
    send_otp: {
      type: 'action',
      description: 'Send OTP to the phone number',
      actions: [
        {
          id: 'send_otp_action',
          executor: 'auth',
          config: {
            action: 'send_otp',
            phone: '{{phone_number}}',
          },
          output: 'otp_result',
          onError: 'retry',
          retryCount: 2,
        },
      ],
      transitions: {
        success: 'collect_otp',
        error: 'otp_send_failed',
      },
    },

    // State 2b: OTP Send Failed
    otp_send_failed: {
      type: 'action',
      description: 'Handle OTP sending failure',
      actions: [
        {
          id: 'otp_failed_message',
          executor: 'response',
          config: {
            message: '❌ Unable to send OTP. Please check the phone number and try again.\n\nType your phone number or "cancel" to stop.',
          },
        },
      ],
      transitions: {
        default: 'collect_phone',
      },
    },

    // State 3: Collect OTP
    collect_otp: {
      type: 'wait',
      description: 'Wait for user to enter OTP',
      onEntry: [
        {
          id: 'ask_otp',
          executor: 'response',
          config: {
            message: '✅ OTP sent to {{phone_number}}\n\n🔢 Please enter the 6-digit code:',
          },
        },
      ],
      actions: [
        {
          id: 'verify_otp',
          executor: 'auth',
          config: {
            action: 'verify_otp',
            phone: '{{phone_number}}',
            otp: '{{_user_message}}',
          },
          output: 'otp_verification',
        },
      ],
      transitions: {
        valid: 'check_profile',
        invalid: 'otp_retry',
        cancel: 'auth_cancelled',
        resend: 'send_otp',
      },
    },

    // State 3b: OTP Retry
    otp_retry: {
      type: 'action',
      description: 'Handle invalid OTP',
      actions: [
        {
          id: 'otp_retry_message',
          executor: 'response',
          config: {
            message: '❌ Invalid OTP. Please try again.\n\nType the 6-digit code, "resend" for new OTP, or "cancel" to stop.',
          },
        },
      ],
      transitions: {
        default: 'collect_otp',
      },
    },

    // State 4: Check if profile is complete
    check_profile: {
      type: 'decision',
      description: 'Check if user profile has name and email',
      conditions: [
        {
          expression: 'context.data.is_personal_info === 0 || !context.data.user_name',
          event: 'need_name',
        },
        {
          expression: 'true', // Profile complete
          event: 'profile_complete',
        },
      ],
      transitions: {
        need_name: 'collect_name',
        profile_complete: 'auth_complete',
      },
    },

    // State 5: Collect Name
    collect_name: {
      type: 'wait',
      description: 'Collect user name for new registrations',
      onEntry: [
        {
          id: 'ask_name',
          executor: 'response',
          config: {
            message: '🎉 Welcome to Mangwale!\n\nTo complete your profile, please tell me your name:',
          },
        },
      ],
      actions: [
        {
          id: 'validate_name',
          executor: 'auth',
          config: {
            action: 'validate_name',
            input: '{{_user_message}}',
          },
          output: 'name_validation',
        },
      ],
      transitions: {
        valid: 'collect_email',
        invalid: 'collect_name', // Re-ask
        cancel: 'auth_complete', // Allow skip
      },
    },

    // State 6: Collect Email
    collect_email: {
      type: 'wait',
      description: 'Collect user email address',
      onEntry: [
        {
          id: 'ask_email',
          executor: 'response',
          config: {
            message: 'Great, {{user_name}}! 📧\n\nNow please provide your email address:',
          },
        },
      ],
      actions: [
        {
          id: 'validate_email',
          executor: 'auth',
          config: {
            action: 'validate_email',
            input: '{{_user_message}}',
          },
          output: 'email_validation',
        },
      ],
      transitions: {
        valid: 'update_profile',
        invalid: 'collect_email', // Re-ask
        skip: 'auth_complete', // Allow skip
      },
    },

    // State 7: Update Profile
    update_profile: {
      type: 'action',
      description: 'Update user profile with name and email',
      actions: [
        {
          id: 'update_user_info',
          executor: 'auth',
          config: {
            action: 'update_profile',
            name: '{{user_name}}',
            email: '{{user_email}}',
          },
          output: 'profile_update_result',
          onError: 'continue', // Don't fail auth if profile update fails
        },
      ],
      transitions: {
        success: 'auth_complete',
        error: 'auth_complete', // Still complete auth even if profile update fails
      },
    },

    // State 8: Auth Complete
    auth_complete: {
      type: 'end',
      description: 'Authentication completed successfully',
      onEntry: [
        {
          id: 'auth_success_message',
          executor: 'response',
          config: {
            message: '✅ Yes, you\'re logged in{{#if user_name}} as {{user_name}}{{/if}}! How can I help you today?',
            buttons: [
              { id: 'btn_food', label: 'Order Food', value: 'order_food' },
              { id: 'btn_parcel', label: 'Send Parcel', value: 'parcel_booking' },
              { id: 'btn_shop', label: 'Shop Online', value: 'search_product' },
            ],
          },
        },
      ],
      transitions: {},
      metadata: {
        completionType: 'success',
        resumePendingAction: true,
      },
    },

    // State 9: Auth Cancelled
    auth_cancelled: {
      type: 'end',
      description: 'User cancelled authentication',
      onEntry: [
        {
          id: 'auth_cancel_message',
          executor: 'response',
          config: {
            message: '👋 No problem! You can continue browsing. Just let me know when you want to login.',
          },
        },
      ],
      transitions: {},
      metadata: {
        completionType: 'cancelled',
      },
    },
  },

  metadata: {
    author: 'Mangwale AI Team',
    createdAt: '2025-11-30',
    tags: ['auth', 'login', 'registration', 'otp'],
    priority: 95, // High priority - auth should intercept quickly
  },
};
