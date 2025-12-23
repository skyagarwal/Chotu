import { Injectable, Logger } from '@nestjs/common';

/**
 * Auth Trigger Service
 * 
 * Determines when authentication is required based on user action and service type.
 * Provides conversational prompts for authentication requests.
 * 
 * Philosophy: Guest-first approach
 * - Users can chat, browse, and explore without logging in
 * - Auth is triggered only when business logic requires it (orders, payments, tracking)
 * - Prompts are conversational and Nashik-local friendly
 */
@Injectable()
export class AuthTriggerService {
  private readonly logger = new Logger(AuthTriggerService.name);

  /**
   * Check if action requires authentication
   * 
   * @param action - User action (e.g., 'place_order', 'browse_menu')
   * @param module - Service module (e.g., 'food', 'parcel', 'ecom')
   * @returns true if auth required, false otherwise
   */
  requiresAuth(action: string, module: string): boolean {
    const authRequiredActions: Record<string, string[]> = {
      food: ['place_order', 'add_to_cart', 'checkout', 'apply_coupon'],
      parcel: ['book_delivery', 'create_order', 'confirm_booking'],
      ecom: ['add_to_cart', 'checkout', 'buy_now'],
      tracking: ['track_order', 'order_status', 'view_order'],
      complaints: ['file_complaint', 'request_refund', 'escalate'],
      games: ['claim_reward', 'redeem_points'], // Can play without auth
      profile: ['view_profile', 'edit_profile', 'view_orders'],
      wallet: ['view_balance', 'add_money', 'withdraw'],
    };

    const required = authRequiredActions[module]?.includes(action) || false;
    
    if (required) {
      this.logger.log(`🔒 Auth required: ${module}/${action}`);
    }
    
    return required;
  }

  /**
   * Get conversational auth prompt based on action and module
   * Uses Nashik-local Hinglish personality
   * 
   * @param action - User action
   * @param module - Service module
   * @returns Conversational auth prompt in Hinglish
   */
  getAuthPrompt(action: string, module: string): string {
    const prompts: Record<string, string> = {
      food: "To confirm your order, I need your phone number for verification. Please enter your 10-digit mobile number.",
      parcel: "To book a delivery, please provide your phone number so we can send you an OTP.",
      ecom: "To proceed to checkout, please log in with your phone number.",
      tracking: "To track your orders, please provide your registered phone number.",
      games: "To claim your rewards, we need to verify your identity. Please enter your phone number.",
      complaints: "To file a complaint, please log in with your phone number.",
      profile: "To view your profile, please verify your phone number.",
      wallet: "For wallet access, please log in with your phone number.",
    };

    const prompt = prompts[module] || "Please log in to continue. What is your phone number?";
    
    this.logger.log(`💬 Auth prompt for ${module}: ${prompt.substring(0, 50)}...`);
    
    return prompt;
  }

  /**
   * Check if user needs location saved
   * Delivery services require location before order
   * 
   * @param module - Service module
   * @returns true if location required
   */
  requiresLocation(module: string): boolean {
    const locationModules = ['food', 'parcel', 'ride'];
    return locationModules.includes(module);
  }

  /**
   * Get conversational location prompt
   * 
   * @param module - Service module
   * @returns Conversational location request
   */
  getLocationPrompt(module: string): string {
    const prompts: Record<string, string> = {
      food: "For delivery, could you please share your current location? This will help us find restaurants near you.",
      parcel: "Please share the pickup location so I can calculate the distance and fare.",
      ride: "Please share your pickup location.",
    };

    return prompts[module] || "Could you please share your location?";
  }

  /**
   * Check if action is guest-accessible
   * 
   * @param action - User action
   * @param module - Service module
   * @returns true if accessible without auth
   */
  isGuestAccessible(action: string, module: string): boolean {
    const guestActions: Record<string, string[]> = {
      food: ['browse_menu', 'search_food', 'view_restaurant', 'get_prices'],
      parcel: ['check_rates', 'get_estimate', 'view_vehicles'],
      ecom: ['search_products', 'view_product', 'browse_category'],
      games: ['play_game', 'view_leaderboard'], // Can play, just can't claim rewards
      general: ['chitchat', 'help', 'faq', 'greeting'],
    };

    return guestActions[module]?.includes(action) || 
           guestActions.general?.includes(action) || 
           false;
  }

  /**
   * Get smart trigger message based on context
   * Explains WHY auth is needed (builds trust)
   * 
   * @param action - User action
   * @param module - Service module
   * @returns Context-aware auth explanation
   */
  getAuthExplanation(action: string, module: string): string {
    const explanations: Record<string, string> = {
      place_order: "Login is required to confirm your order and share contact details with the restaurant.",
      track_order: "We need to verify your identity to show your order history.",
      claim_reward: "We need your phone number to process the reward transfer.",
      book_delivery: "Your phone number is required for the delivery partner to contact you.",
      file_complaint: "Please verify your identity to file a complaint.",
    };

    return explanations[action] || "";
  }

  /**
   * Get OTP request message (after phone number provided)
   * 
   * @param phoneNumber - User's phone number
   * @returns OTP request message
   */
  getOtpRequestMessage(phoneNumber: string): string {
    // Mask phone number for privacy (show last 4 digits)
    const masked = phoneNumber.replace(/(\d{6})(\d{4})/, '******$2');
    
    return `I have sent a 6-digit OTP to ${masked}. Please enter it below to verify.`;
  }

  /**
   * Get welcome back message after successful auth
   * 
   * @param userName - User's name (optional)
   * @returns Welcome message
   */
  getWelcomeMessage(userName?: string): string {
    const name = userName || 'User';
    const greetings = [
      `Welcome back, ${name}! How can I assist you today?`,
      `Hello ${name}! Good to see you again. What would you like to order?`,
      `Greetings ${name}! How may I help you?`,
    ];
    
    // Random greeting for variety
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get session persistence message
   * Explains that they won't need to login again
   */
  getSessionPersistenceMessage(): string {
    return "✅ Login successful! You are now logged in. You can proceed with your order.";
  }
}
