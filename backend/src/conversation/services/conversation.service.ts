import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from '../../session/session.service';
import { PhpParcelService } from '../../php-integration/services/parcel.service';
// New clean architecture services - Channel-agnostic messaging
import { MessagingService } from '../../messaging/services/messaging.service';
import { PhpAuthService } from '../../php-integration/services/php-auth.service';
import { PhpAddressService } from '../../php-integration/services/php-address.service';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { PhpPaymentService } from '../../php-integration/services/php-payment.service';
import { AddressService } from '../../order-flow/services/address.service';
import { OrderHistoryService } from '../../order-flow/services/order-history.service';
import { PaymentService } from '../../order-flow/services/payment.service';
import { WalletService } from '../../order-flow/services/wallet.service';
import { LoyaltyService } from '../../order-flow/services/loyalty.service';
import { CouponService } from '../../order-flow/services/coupon.service';
import { ReviewService } from '../../order-flow/services/review.service';
import { OrderOrchestratorService } from '../../order-flow/services/order-orchestrator.service';
import { Platform } from '../../common/enums/platform.enum';
import { NluClientService } from '../../services/nlu-client.service';
import { ConversationCaptureService } from '../../services/conversation-capture.service';
import { ParcelService } from '../../parcel/services/parcel.service';
import { AgentOrchestratorService } from '../../agents/services/agent-orchestrator.service';
// Gamification disabled - 82 TypeScript errors, needs Prisma schema fixes
// import { FlowEngineService } from '../../flow-engine/services/flow-engine.service';
// import { GameWidgetService } from '../../gamification/services/game-widget.service';
// import { RewardService } from '../../gamification/services/reward.service';  
import { UserSyncService } from '../../user/services/user-sync.service';
import { UserPreferenceService } from '../../personalization/user-preference.service';
import { ConversationEnrichmentService } from '../../personalization/conversation-enrichment.service';
import { AuthTriggerService } from '../../auth/auth-trigger.service';
import { AuthFlowBridgeService } from './auth-flow-bridge.service';

/**
 * ConversationService - MANGWALE CONVERSATION PLATFORM (Core)
 * 
 * This is the channel-agnostic conversation logic that can be reused across:
 * - WhatsApp
 * - Telegram
 * - Web Chat
 * - Mobile App
 * - Voice
 * 
 * Uses MessagingService for channel-agnostic message sending.
 * 
 * PHASE 2: Auto-Training
 * - Logs all conversations to Admin Backend for continuous learning
 * - Flags low confidence predictions for human review
 * 
 * PHASE 3: Agent System Integration ⭐ NEW
 * - AgentOrchestratorService provides intelligent LLM-powered responses
 * - Supports function calling (search, refunds, bookings, image analysis, etc.)
 * - Works across ALL channels automatically (WhatsApp, Telegram, Web, Mobile, Voice)
 * 
 * PHASE 4: Conversational Auth & Personalization ⭐ NEW ⭐
 * - AuthTriggerService provides smart authentication detection
 * - UserPreferenceService injects user context into agent prompts
 * - Nashik personality + user preferences = hyper-personalized conversations
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private sessionService: SessionService,
    // Channel-agnostic messaging (replaces WhatsApp-specific MessageService)
    private messagingService: MessagingService,
    private phpParcelService: PhpParcelService,
    // PHP Integration Layer
    private phpAuthService: PhpAuthService,
    private phpAddressService: PhpAddressService,
    private phpOrderService: PhpOrderService,
    private phpPaymentService: PhpPaymentService,
    // Business Logic Layer
    private addressService: AddressService,
    private orderHistoryService: OrderHistoryService,
    private paymentService: PaymentService,
    private walletService: WalletService,
    private loyaltyService: LoyaltyService,
    private couponService: CouponService,
    private reviewService: ReviewService,
    private orderOrchestratorService: OrderOrchestratorService,
    // AI-powered NLU client
    private nluClientService: NluClientService,
    // Auto-training conversation logger (Phase 2)
    private conversationCaptureService: ConversationCaptureService,
    // AI-powered Parcel Delivery (Phase 3)
    @Inject(forwardRef(() => ParcelService))
    private parcelService: ParcelService,
    // 🤖 AI Agent System (Phase 3) - LLM-powered intelligent responses
    private agentOrchestratorService: AgentOrchestratorService,
    // 🎮 Gamification System - DISABLED (archived to _gamification_archived/)
    // private flowEngineService: FlowEngineService,
    // private gameWidgetService: GameWidgetService,
    // private rewardService: RewardService,
    // 👤 User Sync Service - Links PHP users to AI database
    private userSyncService: UserSyncService,
    // 🧠 User Preference Service - Personalized conversation context
    private userPreferenceService: UserPreferenceService,
    // 🎯 Conversation Enrichment Service - Auto-extract preferences from conversations
    private conversationEnrichmentService: ConversationEnrichmentService,
    // 🔐 Auth Trigger Service - Smart authentication detection
    private authTriggerService: AuthTriggerService,
    // 🔄 Auth Flow Bridge - Migration from legacy auth to flow engine
    private authFlowBridgeService: AuthFlowBridgeService,
  ) {}

  async processMessage(phoneNumber: string, message: any): Promise<void> {
    try {
      // Get or create session
      let session = await this.sessionService.getSession(phoneNumber);
      if (!session) {
        session = await this.sessionService.createSession(phoneNumber);
      }

      const messageText = message.text?.body?.trim().toLowerCase();
      this.logger.log(`📱 Processing message from ${phoneNumber}: "${messageText}" | Current step: ${session.currentStep}`);

      // 🧑‍💼 HUMAN TAKEOVER MODE
      // If escalated, we avoid bot replies for ConversationService-driven channels.
      // We still log the message and (optionally) append it to the linked ERPNext Issue.
      if (session?.data?.escalated_to_human === true) {
        try {
          const rawText = (message.text?.body || '').toString().trim();
          const platform = session?.data?.platform || 'whatsapp';

          if (rawText) {
            await this.conversationCaptureService.captureConversation({
              sessionId: phoneNumber,
              phoneNumber,
              userMessage: rawText,
              nluIntent: 'human_takeover',
              nluConfidence: 0,
              responseText: null,
              responseSuccess: true,
              conversationContext: {
                currentStep: session.currentStep,
                escalated_to_human: true,
                escalation_reason: session?.data?.escalation_reason,
                frappe_issue_id: session?.data?.frappe_issue_id,
              },
              platform,
            });

            const issueId = session?.data?.frappe_issue_id;
            const baseUrl = (process.env.FRAPPE_BASE_URL || '').replace(/\/+$/, '');
            const apiKey = process.env.FRAPPE_API_KEY || '';
            const apiSecret = process.env.FRAPPE_API_SECRET || '';
            if (issueId && baseUrl && apiKey && apiSecret && (globalThis as any).fetch) {
              const url = `${baseUrl}/api/method/frappe.desk.form.utils.add_comment`;
              await (globalThis as any).fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `token ${apiKey}:${apiSecret}`,
                },
                body: JSON.stringify({
                  reference_doctype: 'Issue',
                  reference_name: issueId,
                  content: `[${platform}] User: ${rawText}`,
                }),
              });
            }
          }
        } catch (e: any) {
          this.logger.warn(`Human takeover logging failed (continuing): ${e?.message || e}`);
        }

        // Do not send automated responses while escalated.
        return;
      }

      // 🏠 GLOBAL MENU HANDLER - User can always go back to main menu
      if (['menu', 'main menu', 'home', 'back'].includes(messageText)) {
        this.logger.log(`🏠 User requested main menu, resetting from step: ${session.currentStep}`);
        await this.sessionService.setStep(phoneNumber, 'main_menu');
        await this.showMainMenu(phoneNumber);
        return;
      }

      // Handle messages based on current step
      switch (session.currentStep) {
        case 'welcome':
          await this.handleWelcome(phoneNumber, messageText);
          break;

        // ⚠️ DEPRECATED: Auth steps - will be migrated to auth.flow.ts
        // Set USE_AUTH_FLOW_ENGINE=true in .env to test new flow engine auth
        case 'login_method':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'login_method' for ${phoneNumber}`);
          await this.handleLoginMethod(phoneNumber, messageText);
          break;

        case 'awaiting_phone_number':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'awaiting_phone_number' for ${phoneNumber}`);
          await this.handlePhoneNumberInput(phoneNumber, messageText);
          break;

        case 'registration_choice':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'registration_choice' for ${phoneNumber}`);
          await this.handleRegistrationChoice(phoneNumber, messageText);
          break;

        case 'awaiting_registration_otp':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'awaiting_registration_otp' for ${phoneNumber}`);
          await this.handleOtpVerification(phoneNumber, messageText);
          break;

        case 'phone_check':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'phone_check' for ${phoneNumber}`);
          await this.handlePhoneCheck(phoneNumber, messageText);
          break;

        case 'awaiting_otp':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'awaiting_otp' for ${phoneNumber}`);
          await this.handleOtpVerification(phoneNumber, messageText);
          break;

        case 'awaiting_name':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'awaiting_name' for ${phoneNumber}`);
          await this.handleNameInput(phoneNumber, messageText);
          break;

        case 'awaiting_email':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'awaiting_email' for ${phoneNumber}`);
          await this.handleEmailInput(phoneNumber, messageText);
          break;

        case 'facebook_login':
          this.logger.warn(`📢 DEPRECATED: Legacy auth step 'facebook_login' for ${phoneNumber}`);
          await this.handleFacebookLogin(phoneNumber, messageText);
          break;
        // ⚠️ END DEPRECATED AUTH STEPS

        case 'main_menu':
          await this.handleMainMenu(phoneNumber, messageText);
          break;

        case 'parcel_delivery_ai':
          // AI-Powered Parcel Delivery (Phase 3: AI + Guidelines)
          session = await this.parcelService.handleParcelDelivery(phoneNumber, messageText, session);
          await this.sessionService.saveSession(phoneNumber, session);
          break;

        case 'order_history_selection':
          await this.handleOrderHistorySelection(phoneNumber, messageText);
          break;

        case 'order_actions':
          await this.handleOrderActions(phoneNumber, messageText);
          break;

        case 'track_order_input':
          await this.handleTrackOrderInput(phoneNumber, messageText);
          break;

        case 'manage_addresses':
          await this.handleManageAddresses(phoneNumber, messageText);
          break;

        case 'wallet_menu':
          await this.handleWalletMenu(phoneNumber, messageText);
          break;

        case 'modules':
          await this.handleModuleSelection(phoneNumber, messageText);
          break;

        case 'local_delivery_start':
          await this.handleLocalDeliveryStart(phoneNumber, messageText);
          break;

        case 'bike_delivery':
          await this.handleBikeDeliveryStart(phoneNumber, messageText);
          break;

        case 'pickup_location_method':
          await this.handlePickupLocationMethod(phoneNumber, messageText);
          break;

        case 'pickup_address_selection':
          await this.handleAddressSelection(phoneNumber, messageText, 'pickup');
          break;

        case 'pickup_location':
          await this.handlePickupLocation(phoneNumber, message);
          break;

        case 'awaiting_pickup_landmark':
          await this.handleLandmarkInput(phoneNumber, messageText, 'pickup');
          break;

        case 'delivery_location_method':
          await this.handleDeliveryLocationMethod(phoneNumber, messageText);
          break;

        case 'delivery_address_selection':
          await this.handleAddressSelection(phoneNumber, messageText, 'delivery');
          break;

        case 'delivery_location':
          await this.handleDeliveryLocation(phoneNumber, message);
          break;

        case 'awaiting_delivery_landmark':
          await this.handleLandmarkInput(phoneNumber, messageText, 'delivery');
          break;

        case 'confirm_save_address':
          await this.handleSaveAddressConfirmation(phoneNumber, messageText);
          break;

        case 'select_address_type':
          await this.handleAddressTypeSave(phoneNumber, messageText);
          break;

        case 'mandatory_fields':
          await this.handleMandatoryFields(phoneNumber, messageText);
          break;

        case 'payment_method_selection':
          await this.handlePaymentMethodSelection(phoneNumber, messageText);
          break;

        case 'wallet_insufficient_action':
          await this.handleWalletInsufficientAction(phoneNumber, messageText);
          break;

        case 'wallet_partial_payment_choice':
          await this.handleWalletPartialPaymentChoice(phoneNumber, messageText);
          break;

        case 'wallet_recharge_suggestion_choice':
          await this.handleWalletRechargeSuggestionChoice(phoneNumber, messageText);
          break;

        case 'wallet_recharge_amount':
          await this.handleWalletRechargeAmount(phoneNumber, messageText);
          break;

        case 'checkout':
          await this.handleCheckout(phoneNumber, messageText);
          break;

        // 🎮 GAME FLOW STEPS - Disabled (now handled by flow engine)
        // case 'game_introduction':
        //   await this.handleGameIntroduction(phoneNumber, messageText);
        //   break;

        // case 'game_playing':
        //   await this.handleGamePlaying(phoneNumber, messageText);
        //   break;

        // case 'game_menu':
        //   await this.handleGameMenu(phoneNumber, messageText);
        //   break;

        default:
          // For undefined or unknown steps, route to Agent Orchestrator
          // This allows web chat and new users to use AI-powered conversation
          this.logger.log(`🤖 Unknown/undefined step "${session.currentStep}" - routing to Agent Orchestrator`);
          
          // Get current session and module
          const module = session?.data?.module_name || 'general';
          
          // 🧠 Phase 4: Get user preference context for personalized responses
          let userContext: string | undefined;
          const userId = session?.data?.user_id;
          if (userId) {
            try {
              const prefContext = await this.userPreferenceService.getPreferenceContext(userId);
              userContext = prefContext.fullContext;
              this.logger.log(`🧠 Injecting user preferences: ${prefContext.summary}`);
            } catch (prefError) {
              this.logger.warn(`Failed to load user preferences: ${prefError.message}`);
            }
          }
          
          try {
            const agentResult = await this.agentOrchestratorService.processMessage(
              phoneNumber,
              messageText,
              module,
              null,
              undefined, // no testSession
              userContext, // 🧠 NEW: Pass user preferences
            );
            
            // 🛒 Check for checkout intent/keyword to trigger transactional flow
            // BUT respect flow engine auth requirements - check if user is authenticated first
            const intent = agentResult.metadata?.intent;
            const lowerMessage = messageText?.toLowerCase() || '';
            const isCheckout = intent === 'checkout' || lowerMessage.includes('checkout') || lowerMessage.includes('check out');

            if (isCheckout) {
                // 🔐 Check auth token before proceeding to checkout
                const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
                if (!authToken) {
                  this.logger.log(`🔐 Checkout requires auth - user ${phoneNumber} not logged in`);
                  // Don't handle checkout directly, the flow engine will handle auth
                  // Just send the flow engine response which asks for phone number
                  if (agentResult.response) {
                    const platform = session?.data?.platform || 'whatsapp';
                    const platformEnum = platform === 'web' ? Platform.WEB : 
                                        platform === 'telegram' ? Platform.TELEGRAM : 
                                        Platform.WHATSAPP;
                    await this.messagingService.sendTextMessage(platformEnum, phoneNumber, agentResult.response);
                  }
                  return;
                }
                
                this.logger.log(`🛒 Checkout detected (user authenticated), triggering checkout flow`);
                await this.handleCheckout(phoneNumber, messageText);
                return;
            }

            if (agentResult && agentResult.response) {
              // Detect platform from session
              const platform = session?.data?.platform || 'whatsapp';
              const platformEnum = platform === 'web' ? Platform.WEB : 
                                  platform === 'telegram' ? Platform.TELEGRAM : 
                                  Platform.WHATSAPP;
              
              await this.messagingService.sendTextMessage(
                platformEnum,
                phoneNumber,
                agentResult.response
              );
              
              // 🎯 Phase 4.1: Enrich profile from conversation
              // Skip enrichment if user is performing a transactional action (search, order, etc.)
              this.logger.log(`Agent Result Metadata: ${JSON.stringify(agentResult.metadata)}`);
              const intent = agentResult.metadata?.intent;
              const transactionalIntents = ['order_food', 'search_product', 'checkout', 'add_to_cart', 'parcel_booking', 'track_order'];
              
              // Also check for transactional keywords in the message itself
              // This handles cases where NLU/LLM fails to classify the intent correctly (e.g. "Checkout" -> unknown)
              const lowerMessage = messageText.toLowerCase();
              const transactionalKeywords = ['checkout', 'check out', 'buy', 'order', 'pay', 'confirm', 'track'];
              const isTransactionalKeyword = transactionalKeywords.some(k => lowerMessage.includes(k));

              const isTransactional = (intent && transactionalIntents.includes(intent)) || isTransactionalKeyword;
              this.logger.log(`Intent: ${intent}, Is Transactional: ${isTransactional} (Keyword match: ${isTransactionalKeyword})`);

              if (userId && !isTransactional) {
                try {
                  const enrichment = await this.conversationEnrichmentService.enrichProfileFromMessage(
                    userId,
                    messageText,
                    session?.data?.conversation_history || []
                  );
                  
                  // If we have a confirmation question, ask it naturally
                  if (enrichment && enrichment.priority === 'high') {
                    this.logger.log(`💬 Asking confirmation: ${enrichment.question}`);
                    await this.messagingService.sendTextMessage(
                      platformEnum,
                      phoneNumber,
                      enrichment.question
                    );
                  }
                } catch (enrichError) {
                  this.logger.warn(`Enrichment failed: ${enrichError.message}`);
                }
              }
            }
          } catch (agentError) {
            this.logger.error(`Agent Orchestrator error: ${agentError.message}`);
            // Call the existing handleUnknownStep as fallback
            await this.handleUnknownStep(phoneNumber);
          }
          break;
      }
    } catch (error) {
      this.logger.error(`❌ Error processing message from ${phoneNumber}:`, error);
      
      // Get session for platform detection
      const currentSession = await this.sessionService.getSession(phoneNumber);
      const platform = currentSession?.data?.platform || 'whatsapp';
      const platformEnum = platform === 'web' ? Platform.WEB : 
                          platform === 'telegram' ? Platform.TELEGRAM : 
                          Platform.WHATSAPP;
      
      await this.messagingService.sendTextMessage(platformEnum, 
        phoneNumber,
        '❌ Sorry, something went wrong. Please try again or type "hi" to restart.'
      );
    }
  }

  /**
   * STEP 1: Welcome and initial phone check
   */
  private async handleWelcome(phoneNumber: string, messageText: string): Promise<void> {
    // ✅ NEW: Route ALL messages through Agent Orchestrator (no hardcoding!)
    this.logger.log(`🚀 Routing welcome message to Agent Orchestrator: "${messageText}"`);
    
    try {
      // 🧠 Phase 4: Get user preference context for personalized greetings
      const session = await this.sessionService.getSession(phoneNumber);
      let userContext: string | undefined;
      
      const userId = session?.data?.user_id;
      if (userId) {
        const prefContext = await this.userPreferenceService.getPreferenceContext(userId);
        userContext = prefContext.fullContext;
        this.logger.log(`🧠 Loaded user preferences for ${userId}: ${prefContext.summary}`);
      }
      
      const result = await this.agentOrchestratorService.processMessage(
        phoneNumber,
        messageText,
        'general' as any, // Use 'general' module for greeting/help flows
        undefined, // no imageUrl
        undefined, // no testSession
        userContext, // 🧠 NEW: Pass user preferences
      );
      
      if (result && result.response) {
        await this.messagingService.sendTextMessage(
          Platform.WHATSAPP,
          phoneNumber,
          result.response
        );
        
        // 🎯 Phase 4.1: Enrich profile from welcome message
        const session = await this.sessionService.getSession(phoneNumber);
        const userId = session?.data?.user_id;
        
        // Skip enrichment if user is performing a transactional action
        const intent = result.metadata?.intent;
        const transactionalIntents = ['order_food', 'search_product', 'checkout', 'add_to_cart', 'parcel_booking', 'track_order'];
        const isTransactional = intent && transactionalIntents.includes(intent);
        
        if (userId && !isTransactional) {
          try {
            const enrichment = await this.conversationEnrichmentService.enrichProfileFromMessage(
              userId,
              messageText,
              session?.data?.conversation_history || []
            );
            
            // If we have a high-priority confirmation question, ask it
            if (enrichment && enrichment.priority === 'high') {
              this.logger.log(`💬 Asking confirmation: ${enrichment.question}`);
              await this.messagingService.sendTextMessage(
                Platform.WHATSAPP,
                phoneNumber,
                enrichment.question
              );
            }
          } catch (enrichError) {
            this.logger.warn(`Enrichment failed: ${enrichError.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in agent orchestrator: ${error.message}`);
      // Fallback
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP, 
        phoneNumber,
        '👋 Hello! How can I help you today?'
      );
    }
  }

  /**
   * Show login/registration options
   */
  private async showLoginOptions(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '👋 Welcome to Mangwale Parcel Service!\n\n' +
      'Please choose how you want to continue:\n\n' +
      '1️⃣ Login with OTP 📱\n' +
      '2️⃣ Login with Facebook 📘\n\n' +
      'Reply with 1 or 2:'
    );
    await this.sessionService.setStep(phoneNumber, 'login_method');
  }

  /**
   * Handle login method selection
   */
  private async handleLoginMethod(phoneNumber: string, messageText: string): Promise<void> {
    // ✅ CHECK AUTHENTICATION FIRST - Skip login if already authenticated
    const isAuthenticated = await this.sessionService.getData(phoneNumber, 'authenticated');
    
    if (isAuthenticated) {
      this.logger.log(`✅ User ${phoneNumber} already authenticated, showing main menu`);
      await this.showMainMenu(phoneNumber);
      return;
    }
    
    if (messageText === '1') {
      await this.requestPhoneNumber(phoneNumber);
    } else if (messageText === '2') {
      await this.handleFacebookLogin(phoneNumber, messageText);
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option:\n\n' +
        '1️⃣ Login with OTP 📱\n' +
        '2️⃣ Login with Facebook 📘'
      );
    }
  }

  /**
   * Request phone number from user
   */
  private async requestPhoneNumber(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '📱 **Phone Number Verification**\n\n' +
      'Please enter your 10-digit mobile number:\n\n' +
      '📝 Examples:\n' +
      '  • 9923383838\n' +
      '  • 9158886329\n\n' +
      '(Don\'t add +91 or country code - we\'ll add it automatically)'
    );
    await this.sessionService.setStep(phoneNumber, 'awaiting_phone_number');
  }

  /**
   * Handle phone number input and send OTP
   * PHP backend handles both existing and new users through the same OTP flow
   * ENHANCED: Handles any phone format from any frontend
   */
  private async handlePhoneNumberInput(phoneNumber: string, messageText: string): Promise<void> {
    // Clean phone number - remove ALL non-digit characters except +
    let inputPhone = messageText.trim().replace(/[\s\-\(\)\.\,]/g, '');
    
    this.logger.log(`📱 Raw input: "${messageText}" → Cleaned: "${inputPhone}"`);
    
    // Remove any leading zeros (some users might type 09158886329)
    inputPhone = inputPhone.replace(/^0+/, '');
    
    // Extract only digits (removing + temporarily for normalization)
    const digitsOnly = inputPhone.replace(/\D/g, '');
    
    // Indian phone number normalization logic
    // Handle various input formats:
    // 9158886329 → +919158886329 (10 digits)
    // 919158886329 → +919158886329 (12 digits starting with 91)
    // +919158886329 → +919158886329 (already formatted)
    // 09158886329 → +919158886329 (leading zero removed)
    // 91-915-888-6329 → +919158886329 (dashes removed)
    
    if (digitsOnly.length === 10) {
      // Indian 10-digit number - add +91
      inputPhone = '+91' + digitsOnly;
      this.logger.log(`📱 10-digit number normalized to: ${inputPhone}`);
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      // 12 digits starting with 91 - add +
      inputPhone = '+' + digitsOnly;
      this.logger.log(`📱 12-digit number (91...) normalized to: ${inputPhone}`);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('91')) {
      // 11 digits starting with 91 (maybe missing a digit) - add +
      inputPhone = '+' + digitsOnly;
      this.logger.log(`📱 11-digit number (91...) normalized to: ${inputPhone}`);
    } else if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      // Other international format - add + if not present
      inputPhone = '+' + digitsOnly;
      this.logger.log(`📱 International number normalized to: ${inputPhone}`);
    } else {
      // Invalid length
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Invalid phone number format.\n\n' +
        'Please enter a valid mobile number:\n' +
        '📱 Example: 9923383838\n' +
        '📱 Example: 9158886329\n' +
        '📱 Example: +919158886329\n' +
        '📱 Example: 91-9158886329\n\n' +
        'Any format works!'
      );
      return;
    }
    
    // Final validation - must be + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(inputPhone)) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Invalid phone number format after normalization.\n\n' +
        'Please enter a valid mobile number.'
      );
      return;
    }

    this.logger.log(`✅ Final normalized phone: ${inputPhone}`);
    
    // Store the phone number with + sign (PHP requirement)
    await this.sessionService.setData(phoneNumber, 'otp_phone', inputPhone);

    // Send OTP - PHP API will handle user lookup
    try {
      this.logger.log(`📞 Sending OTP to ${inputPhone}`);
      
      // REFACTORED: Using PhpAuthService.sendOtp (handles both login and registration)
      const otpResult = await this.phpAuthService.sendOtp(inputPhone);
      
      if (otpResult.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '✅ **OTP Sent**\n\n' +
          `📲 We've sent a verification code to ${inputPhone}\n\n` +
          '🔢 Please enter the 6-digit OTP code:'
        );
        await this.sessionService.setStep(phoneNumber, 'awaiting_otp');
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to send OTP. Please try again.\n\n' +
          'Type your phone number again:'
        );
      }
    } catch (error) {
      this.logger.error('Error processing phone number:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Error processing your request. Please try again later.'
      );
    }
  }

  /**
   * Send OTP for existing user login
   */
  private async sendOtpForLogin(phoneNumber: string, inputPhone: string): Promise<void> {
    try {
      // REFACTORED: Using PhpAuthService instead of PhpParcelService
      const otpResult = await this.phpAuthService.sendOtp(inputPhone);
      
      if (otpResult.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '✅ **Existing User Found**\n\n' +
          `� We've sent an OTP to ${inputPhone}\n\n` +
          'Please enter the 6-digit code:'
        );
        await this.sessionService.setStep(phoneNumber, 'awaiting_otp');
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to send OTP. Please try again.\n\n' +
          'Type your phone number again:'
        );
      }
    } catch (error) {
      this.logger.error('Error sending OTP:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Error sending OTP. Please try again later.'
      );
    }
  }

  /**
   * Offer registration for new users
   */
  private async offerRegistration(phoneNumber: string, inputPhone: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '👤 **New User Detected**\n\n' +
      `The phone number ${inputPhone} is not registered.\n\n` +
      'Would you like to:\n\n' +
      '1️⃣ Register now 📝\n' +
      '2️⃣ Try different number 🔄\n\n' +
      'Reply with 1 or 2:'
    );
    await this.sessionService.setStep(phoneNumber, 'registration_choice');
  }

  /**
   * Handle registration choice
   */
  private async handleRegistrationChoice(phoneNumber: string, messageText: string): Promise<void> {
    const inputPhone = await this.sessionService.getData(phoneNumber, 'otp_phone');
    
    if (messageText === '1') {
      // Start registration process
      await this.startRegistration(phoneNumber, inputPhone);
    } else if (messageText === '2') {
      // Ask for phone number again
      await this.requestPhoneNumber(phoneNumber);
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option:\n\n' +
        '1️⃣ Register now 📝\n' +
        '2️⃣ Try different number 🔄'
      );
    }
  }

  /**
   * Start registration process for new users
   */
  private async startRegistration(phoneNumber: string, inputPhone: string): Promise<void> {
    try {
      // REFACTORED: Using PhpAuthService.sendOtp (handles both login and registration)
      const otpResult = await this.phpAuthService.sendOtp(inputPhone);
      
      if (otpResult.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '📝 **Registration Started**\n\n' +
          `📲 We've sent an OTP to ${inputPhone}\n\n` +
          'Please enter the 6-digit code to verify your number:'
        );
        await this.sessionService.setStep(phoneNumber, 'awaiting_registration_otp');
        await this.sessionService.setData(phoneNumber, 'is_registration', true);
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to send OTP. Please try again.'
        );
      }
    } catch (error) {
      this.logger.error('Error starting registration:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Error starting registration. Please try again later.'
      );
    }
  }

  /**
   * Start phone verification process - Try to send OTP directly (DEPRECATED)
   */
  private async startPhoneVerification(phoneNumber: string): Promise<void> {
    // This method is now deprecated - use handlePhoneNumberInput instead
    await this.showLoginOptions(phoneNumber);
  }

  /**
   * STEP 2: Handle phone check and login method selection (DEPRECATED - use handleLoginMethod)
   */
  private async handlePhoneCheck(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === '1') {
      // OTP Login selected
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '📱 **OTP Login**\n\n' +
        'Please enter your phone number to receive OTP:'
      );
      await this.sessionService.setStep(phoneNumber, 'awaiting_otp');
      await this.sessionService.setData(phoneNumber, 'login_method', 'otp');
    } else if (messageText === '2') {
      // Facebook Login selected
      await this.handleFacebookLogin(phoneNumber, '');
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option:\n\n' +
        '1️⃣ Login with OTP 📱\n' +
        '2️⃣ Login with Facebook 📘'
      );
    }
  }

  /**
   * STEP 3: Handle OTP verification
   */
  private async handleOtpVerification(phoneNumber: string, messageText: string): Promise<void> {
    const loginMethod = await this.sessionService.getData(phoneNumber, 'login_method');
    
    if (loginMethod === 'otp' && !await this.sessionService.getData(phoneNumber, 'otp_phone')) {
      // User needs to enter phone number first
      await this.handleOtpPhoneInput(phoneNumber, messageText);
    } else {
      // User is entering OTP code
      await this.handleOtpCodeInput(phoneNumber, messageText);
    }
  }

  /**
   * Handle phone number input for OTP
   */
  private async handleOtpPhoneInput(phoneNumber: string, messageText: string): Promise<void> {
    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(messageText.replace(/\s/g, ''))) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid phone number (e.g., +1234567890):'
      );
      return;
    }

    const inputPhone = messageText.replace(/\s/g, '');
    await this.sessionService.setData(phoneNumber, 'otp_phone', inputPhone);

    try {
      // REFACTORED: Using PhpAuthService instead of PhpParcelService
      const result = await this.phpAuthService.sendOtp(inputPhone);
      
      if (result.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          `📱 OTP sent to ${inputPhone}\n\nPlease enter the 6-digit code you received:`
        );
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ ' + (result.message || 'Failed to send OTP. Please try again.')
        );
      }
    } catch (error) {
      this.logger.error('Error sending OTP:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to send OTP at this time. Please try again later.'
      );
    }
  }

  /**
   * Handle OTP code input and verification
   * Uses PHP API response (is_personal_info) to determine if user exists
   */
  private async handleOtpCodeInput(phoneNumber: string, messageText: string): Promise<void> {
    // Validate OTP format
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(messageText)) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid 6-digit OTP code:'
      );
      return;
    }

    const inputPhone = await this.sessionService.getData(phoneNumber, 'otp_phone') || phoneNumber;
    
    try {
      // Verify OTP with PHP API - it will tell us if user has complete info
      const result = await this.phpAuthService.verifyOtp(inputPhone, messageText);
      
      if (result.success && result.data) {
        this.logger.log(`✅ OTP verified for ${inputPhone}, is_personal_info: ${result.data.is_personal_info}, token: ${result.data.token ? 'YES' : 'NO'}`);

        // Check if user needs to provide personal information
        // is_personal_info = 0 means user has no f_name in database
        if (result.data.is_personal_info === 0) {
          // User exists but has no name - need to collect personal info
          this.logger.log(`🆕 User ${inputPhone} has no name in database (is_personal_info=0)`);
          
          await this.sessionService.setData(phoneNumber, {
            auth_phone: inputPhone,
            awaiting_personal_info: true,
            authenticated: false, // Not fully authenticated yet
          });
          
          await this.sessionService.setStep(phoneNumber, 'awaiting_name');
          
          await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
            phoneNumber,
            '🎉 Welcome to Mangwale!\n\nTo complete your registration, please tell me your full name:'
          );
          return;
        }

        // User has complete info (is_personal_info = 1) - fetch user details and store JWT token
        this.logger.log(`👤 Existing user ${inputPhone} authenticated with token`);
        
        // Fetch user profile to get name and other details
        let userName = null;
        try {
          // REFACTORED: Using PhpAuthService instead of PhpParcelService
          const userProfile = await this.phpAuthService.getUserProfile(result.data.token);
          if (userProfile && userProfile.firstName) {
            userName = `${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}`;
            this.logger.log(`✅ Fetched user profile: ${userName}`);
          }
        } catch (error) {
          this.logger.warn(`Could not fetch user profile: ${error.message}`);
        }
        
        await this.sessionService.setData(phoneNumber, {
          auth_token: result.data.token,
          auth_phone: inputPhone,
          user_name: userName,
          user_info: result.data,
          authenticated: true,
        });
        
        this.logger.log(`🔍 DEBUG EARLY: After setData, before sync. phoneNumber=${phoneNumber}`);
        
        // 🔄 CRITICAL: Sync user to AI database for persistence
        try {
          const aiUser = await this.userSyncService.syncUser(inputPhone, result.data.token);
          if (aiUser) {
            this.logger.log(`✅ User synced to AI DB: ai_user_id=${aiUser.id}, php_user_id=${aiUser.phpUserId}`);
          } else {
            this.logger.warn(`⚠️ User sync failed for ${inputPhone}, continuing without AI persistence`);
          }
        } catch (syncError) {
          this.logger.error(`Error syncing user to AI DB: ${syncError.message}`);
          // Continue even if sync fails - user can still use the service
        }
        
        // 🔄 RESUME PENDING INTENT (if user was trying to do something before auth)
        const session = await this.sessionService.getSession(phoneNumber);
        const pendingIntent = session?.data?.pendingIntent;
        const pendingMessage = session?.data?.pendingMessage; // Original message before auth
        
        this.logger.log(`🔍 DEBUG: Checking pendingIntent. phoneNumber=${phoneNumber}, session.data keys=${Object.keys(session?.data || {}).join(',')}, pendingIntent=${pendingIntent}, pendingMessage=${pendingMessage}`);
        
        if (pendingIntent) {
          this.logger.log(`🔄 Resuming pending intent after auth: ${pendingIntent}, original message: ${pendingMessage}`);
          
          // Clear pending data AND auth state to allow normal routing
          const clearedData = {
            ...session.data,
            pendingAction: null,
            pendingModule: null,
            pendingIntent: null,
            pendingEntities: null,
            pendingMessage: null, // Clear the stored message
            _conversation_state: null, // CRITICAL: Clear auth state so processMessage routes normally
          };
          // Actually delete the key instead of setting to null
          delete clearedData._conversation_state;
          
          this.logger.log(`🔍 DEBUG: Cleared data keys: ${Object.keys(clearedData).join(', ')}`);
          
          // IMPORTANT: Also clear the top-level currentStep to reset auth flow
          await this.sessionService.saveSession(phoneNumber, {
            currentStep: 'welcome',  // Reset to normal routing
            data: clearedData
          });
          
          // Send success message and trigger the pending intent flow
          await this.messagingService.sendTextMessage(Platform.WHATSAPP,
            phoneNumber,
            `✅ Login successful${userName ? `, ${userName}` : ''}!\n\nResuming your request...`
          );
          
          // Use original message if available, otherwise map intent to generic message
          // This is CRITICAL for cart flow - "Add Misal to cart" must be replayed, not "add_to_cart"
          let triggerMessage = pendingMessage;
          
          if (!triggerMessage) {
            // Fallback to intent mapping for backward compatibility
            const intentToMessage: Record<string, string> = {
              'parcel_booking': 'send parcel',
              'order_food': 'order food',
              'search_product': 'search products',
              'track_order': 'track my order',
              'add_to_cart': 'show my cart', // Better fallback for cart
            };
            triggerMessage = intentToMessage[pendingIntent] || pendingIntent;
          }
          
          this.logger.log(`🔄 Replaying message after auth: "${triggerMessage}"`);
          
          // Call processMessage recursively with the trigger message
          await this.processMessage(phoneNumber, {
            text: { body: triggerMessage },
            from: phoneNumber,
            type: 'text',
          });
          
          return;
        }
        
        await this.showModules(phoneNumber, { name: userName, phone: inputPhone });
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Invalid OTP code. Please try again:'
        );
      }
    } catch (error) {
      this.logger.error('Error verifying OTP:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to verify OTP. Please try again.'
      );
    }
  }

  /**
   * Handle name input for new users (is_personal_info = 0)
   * This is called after successful OTP verification when user needs to provide their name
   * UPDATED: Now also asks for email address
   */
  private async handleNameInput(phoneNumber: string, messageText: string): Promise<void> {
    const name = messageText.trim();
    
    // Validate name (at least 2 characters)
    if (name.length < 2) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid name (at least 2 characters):'
      );
      return;
    }

    // Store name and ask for email
    await this.sessionService.setData(phoneNumber, 'temp_user_name', name);
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      `✅ Thank you, ${name}!\n\n` +
      '📧 Now please provide your email address:\n\n' +
      '(Example: yourname@gmail.com)'
    );
    
    await this.sessionService.setStep(phoneNumber, 'awaiting_email');
  }

  /**
   * Handle email input for new users
   * This is called after name collection
   */
  private async handleEmailInput(phoneNumber: string, messageText: string): Promise<void> {
    const email = messageText.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid email address:\n\n' +
        '(Example: yourname@gmail.com)'
      );
      return;
    }

    const inputPhone = await this.sessionService.getData(phoneNumber, 'auth_phone');
    const name = await this.sessionService.getData(phoneNumber, 'temp_user_name');
    
    if (!inputPhone || !name) {
      this.logger.error(`Missing auth_phone or name for ${phoneNumber}`);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Session expired. Please start over by typing "hi".'
      );
      return;
    }

    try {
      this.logger.log(`📝 Updating user info for ${inputPhone} with name: ${name}, email: ${email}`);
      
      // REFACTORED: Using PhpAuthService instead of PhpParcelService
      const result = await this.phpAuthService.updateUserInfo(inputPhone, name, email);
      
      if (result.success && result.token) {
        this.logger.log(`✅ User info updated, received JWT token`);
        
        // Store authentication data with JWT token
        await this.sessionService.setData(phoneNumber, {
          auth_token: result.token,
          auth_phone: inputPhone,
          user_email: email,
          user_info: result,
          authenticated: true,
          awaiting_personal_info: false,
        });
        
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          `✅ Perfect! Your account is now set up. 😊\n\nLet me show you what I can help you with...`
        );
        
        // Continue to module selection (which now goes directly to bike delivery)
        await this.showModules(phoneNumber, { name, email, phone: inputPhone });
      } else {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ ' + (result.message || 'Failed to update your information. Please try again.')
        );
      }
    } catch (error) {
      this.logger.error('Error updating user info:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to update your information. Please try again or contact support.'
      );
    }
  }

  /**
   * STEP 4: Handle Facebook login (placeholder for now)
   */
  private async handleFacebookLogin(phoneNumber: string, messageText: string): Promise<void> {
    // TODO: Implement Facebook login integration with PHP backend
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '🚧 Facebook login is coming soon!\n\n' +
      'For now, please use OTP login. Type "1" to continue with OTP.'
    );
    await this.sessionService.setStep(phoneNumber, 'phone_check');
  }

  /**
   * STEP 5: Show available modules after successful authentication
   * UPDATED: Skip module selection, go directly to bike delivery
   */
  private async showModules(phoneNumber: string, userInfo: any): Promise<void> {
    // Store user info in session
    await this.sessionService.setData(phoneNumber, 'user_name', userInfo.name);
    await this.sessionService.setData(phoneNumber, 'module_id', 1);
    await this.sessionService.setData(phoneNumber, 'transport_type', 'bike');
    
    // PHASE 2: Show main menu instead of going directly to delivery
    await this.showMainMenu(phoneNumber, userInfo);
  }

  /**
   * Show main menu

  /**
   * Show main menu with all available options
   * PHASE 2: New clean architecture main menu
   */
  private async showMainMenu(phoneNumber: string, userInfo?: any): Promise<void> {
    const userName = userInfo?.name || await this.sessionService.getData(phoneNumber, 'user_name');
    const greeting = userName ? `👋 Welcome back, ${userName}!` : '👋 Welcome!';
    
    await this.messagingService.sendButtonMessage(
      Platform.WHATSAPP,
      phoneNumber,
      `${greeting}\n\n` +
      '🏠 **Main Menu**\n\n' +
      'What would you like to do?',
      [
        { id: '1', title: '📦 New Order' },
        { id: '2', title: '📋 History' },
        { id: '3', title: '🚚 Track' },
        { id: '4', title: '📍 Addresses' },
        { id: '5', title: '👛 Wallet' },
        { id: '6', title: '💬 Help' }
      ]
    );
    
    await this.sessionService.setStep(phoneNumber, 'main_menu');
  }

  /**
   * Handle main menu selection
   * PHASE 2: Router for all main menu options
   * NOW WITH AI: Supports both numbered options AND natural language!
   */
  private async handleMainMenu(phoneNumber: string, messageText: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    
    switch (messageText) {
      case '1':
        // New Order - Start bike delivery flow with saved addresses check
        await this.sessionService.setData(phoneNumber, 'module_id', 1);
        await this.sessionService.setData(phoneNumber, 'transport_type', 'bike');
        
        // Fetch saved addresses if user is authenticated
        const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
        if (authToken) {
          try {
            const savedAddresses = await this.phpParcelService.getSavedAddresses(authToken);
            if (savedAddresses.success && savedAddresses.data.length > 0) {
              // Store addresses in session for later use
              await this.sessionService.setData(phoneNumber, 'saved_addresses', savedAddresses.data);
              this.logger.log(`📍 Loaded ${savedAddresses.data.length} saved addresses for ${phoneNumber}`);
            }
          } catch (error) {
            this.logger.error(`Failed to fetch saved addresses: ${error.message}`);
          }
        }
        
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '🚴‍♂️ **New Bike Delivery**\n\n' +
          '📦 Fast and reliable delivery within city limits.\n\n' +
          '📍 Let\'s start with your pickup location:\n\n' +
          '1️⃣ Share GPS Location 📍\n' +
          '2️⃣ Select from Saved Addresses 🏠\n\n' +
          'Reply with 1 or 2:'
        );
        await this.sessionService.setStep(phoneNumber, 'pickup_location_method');
        break;
        
      case '2':
        // Order History
        await this.showOrderHistory(phoneNumber);
        break;
        
      case '3':
        // Track Order
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '🚚 **Track Your Order**\n\n' +
          'Please enter your order ID:\n' +
          '(Example: 103099)'
        );
        await this.sessionService.setStep(phoneNumber, 'track_order_input');
        break;
        
      case '4':
        // My Addresses
        await this.showSavedAddresses(phoneNumber);
        break;
        
      case '5':
        // My Wallet
        await this.showWalletMenu(phoneNumber);
        break;
        
      case '6':
        // Help & Support
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '💬 **Help & Support**\n\n' +
          '📞 Customer Care: +91 9923383838\n' +
          '📧 Email: support@mangwale.com\n' +
          '🕐 Hours: 9 AM - 9 PM (Mon-Sat)\n\n' +
          'Type "menu" to return to main menu.'
        );
        break;
        
      default:
        // 🧠 AI-POWERED NATURAL LANGUAGE UNDERSTANDING
        // User didn't select a number - try to understand their intent with AI
        await this.handleNaturalLanguageMainMenu(phoneNumber, messageText);
        break;
    }
  }

  /**
   * � AI-Powered Natural Language Handler with Agent System
   * 
   * PHASE 3: Agent System Integration
   * 
   * Uses AgentOrchestratorService to provide intelligent LLM-powered responses.
   * The agent system:
   * - Understands context and intent using LLM
   * - Calls functions dynamically (search, refund, booking, etc.)
   * - Works across ALL channels (WhatsApp, Telegram, Web, Mobile, Voice)
   * - Self-organizes based on user needs
   * 
   * Examples:
   * - "show me pizza under 500" → SearchAgent + search_products()
   * - "my food was cold, refund" → ComplaintsAgent + process_refund()
   * - "I want to send a package" → BookingAgent + calculate_parcel_cost()
   */
  private async handleNaturalLanguageMainMenu(phoneNumber: string, messageText: string): Promise<void> {
    try {
      const session = await this.sessionService.getSession(phoneNumber);
      
      // 🎮 Game trigger disabled - Prisma schema mismatch
      // const lowerText = messageText.toLowerCase();
      // if (lowerText.includes('play game') || 
      //     lowerText.includes('earn points') || 
      //     lowerText.includes('training game')) {
      //   this.logger.log(`🎮 Game trigger detected: "${messageText}"`);
      //   await this.flowEngineService.startFlow('training_game_v1', {
      //     sessionId: phoneNumber,
      //     phoneNumber,
      //     userId: session?.user_id,
      //   });
      //   return; // Don't process through AI
      // }
      
      // Detect module from session or default to 'food'
      const module = (session?.data?.module_name || 'food').toLowerCase();
      
      this.logger.log(
        `� Routing to Agent Orchestrator: "${messageText}" | ` +
        `phoneNumber: ${phoneNumber} | module: ${module}`
      );

      // Use Agent Orchestrator to process message
      const agentResult = await this.agentOrchestratorService.processMessage(
        phoneNumber,
        messageText,
        module,
        null // No image for text messages
      );

      // 🛒 Check for checkout intent/keyword to trigger transactional flow
      // BUT respect flow engine auth requirements
      const intent = agentResult.metadata?.intent;
      const lowerMessage = messageText?.toLowerCase() || '';
      const isCheckout = intent === 'checkout' || lowerMessage.includes('checkout') || lowerMessage.includes('check out');

      if (isCheckout) {
          // 🔐 Check auth token before proceeding to checkout
          const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
          if (!authToken) {
            this.logger.log(`🔐 Checkout (Main Menu) requires auth - user ${phoneNumber} not logged in`);
            // Send flow engine response (should ask for phone) instead of jumping to checkout
            if (agentResult.response) {
              await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, agentResult.response);
            }
            return;
          }
          
          this.logger.log(`🛒 Checkout detected in Main Menu (user authenticated), triggering checkout flow`);
          await this.handleCheckout(phoneNumber, messageText);
          return;
      }

      // Log conversation for auto-training
      await this.conversationCaptureService.captureConversation({
        sessionId: phoneNumber,
        phoneNumber,
        userMessage: messageText,
        nluIntent: 'agent_response',
        nluConfidence: agentResult.response ? 0.9 : 0.3,
        responseText: agentResult.response,
        responseSuccess: !!agentResult.response,
        conversationContext: { currentStep: 'main_menu' },
        platform: session?.data?.platform || 'whatsapp',
      });

      if (agentResult.response) {
        // Agent successfully generated response
        this.logger.log(
          `✅ Agent generated response | ` +
          `Functions called: ${agentResult.functionsCalled?.length || 0} | ` +
          `Execution time: ${agentResult.executionTime}ms`
        );

        // Detect platform from session (web, whatsapp, telegram)
        const platform = session?.data?.platform || 'whatsapp';
        const platformEnum = platform === 'web' ? Platform.WEB : 
                            platform === 'telegram' ? Platform.TELEGRAM : 
                            Platform.WHATSAPP;
        
        this.logger.log(`📤 Sending response via ${platform} platform`);

        // Send agent's response to user (works on ALL channels)
        await this.messagingService.sendTextMessage(
          platformEnum,
          phoneNumber,
          agentResult.response
        );
      } else {
        // Agent failed or returned empty - fallback to menu
        this.logger.warn(`⚠️ Agent returned empty response`);

        await this.messagingService.sendTextMessage(
          Platform.WHATSAPP,
          phoneNumber,
          '🤔 I didn\'t quite understand that.\n\n' +
          'Please choose from the menu options (1-6):'
        );
        await this.showMainMenu(phoneNumber);
      }

    } catch (error) {
      this.logger.error(`❌ Agent orchestration error: ${error}`);
      
      // Fallback to showing menu if agents fail
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        '❌ Something went wrong. Please try again or select from menu:'
      );
      await this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Show order history using OrderHistoryService
   * PHASE 2: Order history integration
   */
  private async showOrderHistory(phoneNumber: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    if (!authToken) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please login first to view your order history.'
      );
      return;
    }

    try {
      // Get formatted order history using order history service
      const orderHistory = await this.orderHistoryService.getFormattedOrderHistory(authToken, 10);
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        orderHistory + '\n\n' +
        'Reply with:\n' +
        '• Order number (1-10) to view details\n' +
        '• "menu" to return to main menu'
      );
      
      await this.sessionService.setStep(phoneNumber, 'order_history_selection');
    } catch (error) {
      this.logger.error('Error fetching order history:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to fetch order history. Please try again later.'
      );
      await this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Handle order history selection
   * PHASE 2: Order detail viewing and repeat order
   */
  private async handleOrderHistorySelection(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === 'menu') {
      await this.showMainMenu(phoneNumber);
      return;
    }

    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    try {
      // Get orders to select from
      const orders = await this.phpOrderService.getOrders(authToken, 10);
      
      if (!orders || orders.length === 0) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to load orders. Please try again.'
        );
        return;
      }

      const selectedOrder = await this.orderHistoryService.selectOrderByIndex(
        orders, 
        parseInt(messageText)
      );
      
      if (!selectedOrder) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Invalid selection. Please enter a number from the list or "menu".'
        );
        return;
      }

      // Show order details
      const orderDetailsResult = await this.orderHistoryService.getOrderDetails(authToken, selectedOrder.id);
      
      if (!orderDetailsResult.success || !orderDetailsResult.formattedText) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to fetch order details.'
        );
        return;
      }
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, orderDetailsResult.formattedText);
      
      // Ask if they want to repeat order
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '\n📦 **Quick Actions:**\n\n' +
        '1️⃣ Repeat this order\n' +
        '2️⃣ Track order\n' +
        '3️⃣ Back to order history\n' +
        '4️⃣ Main menu\n\n' +
        'Reply with your choice:'
      );
      
      await this.sessionService.setData(phoneNumber, 'selected_order_id', selectedOrder.id);
      await this.sessionService.setStep(phoneNumber, 'order_actions');
    } catch (error) {
      this.logger.error('Error fetching order details:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to fetch order details. Please try again.'
      );
    }
  }

  /**
   * Handle order actions (repeat, track, etc.)
   * PHASE 2: Post-order actions handler
   */
  private async handleOrderActions(phoneNumber: string, messageText: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    const orderId = session.data.selected_order_id;
    const authToken = session.data.auth_token;
    
    switch (messageText) {
      case '1':
        // Repeat order
        try {
          const orderDetails = await this.phpOrderService.getOrderDetails(authToken, orderId);
          if (!orderDetails) {
            throw new Error('Unable to fetch order details');
          }
          
          const repeatOrderData = this.orderHistoryService.createRepeatOrderData(orderDetails);
          
          // Pre-fill session with order data
          await this.sessionService.setData(phoneNumber, 'pickup_latitude', repeatOrderData.pickupAddress.latitude);
          await this.sessionService.setData(phoneNumber, 'pickup_longitude', repeatOrderData.pickupAddress.longitude);
          await this.sessionService.setData(phoneNumber, 'pickup_address', repeatOrderData.pickupAddress.address);
          await this.sessionService.setData(phoneNumber, 'pickup_landmark', repeatOrderData.pickupAddress.landmark);
          
          await this.sessionService.setData(phoneNumber, 'delivery_latitude', repeatOrderData.deliveryAddress.latitude);
          await this.sessionService.setData(phoneNumber, 'delivery_longitude', repeatOrderData.deliveryAddress.longitude);
          await this.sessionService.setData(phoneNumber, 'delivery_address', repeatOrderData.deliveryAddress.address);
          await this.sessionService.setData(phoneNumber, 'delivery_landmark', repeatOrderData.deliveryAddress.landmark);
          
          await this.sessionService.setData(phoneNumber, 'receiver_name', repeatOrderData.deliveryAddress.contactPersonName);
          await this.sessionService.setData(phoneNumber, 'receiver_phone', repeatOrderData.deliveryAddress.phone);
          
          await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
            phoneNumber,
            '✅ Order details copied!\n\n' +
            '📦 Using the same pickup and delivery locations.\n\n' +
            'Proceeding to payment selection...'
          );
          
          // Skip to payment selection
          await this.handlePaymentMethodSelection(phoneNumber, null);
        } catch (error) {
          this.logger.error('Error repeating order:', error);
          await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
            phoneNumber,
            '❌ Unable to repeat order. Please try again.'
          );
          await this.showMainMenu(phoneNumber);
        }
        break;
        
      case '2':
        // Track order
        await this.handleTrackOrder(phoneNumber, orderId.toString());
        break;
        
      case '3':
        // Back to order history
        await this.showOrderHistory(phoneNumber);
        break;
        
      case '4':
        // Main menu
        await this.showMainMenu(phoneNumber);
        break;
        
      default:
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Invalid option. Please select 1-4.'
        );
        break;
    }
  }

  /**
   * Handle track order input
   * PHASE 2: Order tracking by ID
   */
  private async handleTrackOrderInput(phoneNumber: string, messageText: string): Promise<void> {
    const orderId = messageText.trim();
    
    if (!/^\d+$/.test(orderId)) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid order ID (numbers only).'
      );
      return;
    }

    await this.handleTrackOrder(phoneNumber, orderId);
  }

  /**
   * Track an order using OrderOrchestratorService
   * PHASE 2: Order tracking implementation
   */
  private async handleTrackOrder(phoneNumber: string, orderId: string): Promise<void> {
    try {
      const trackingResult = await this.orderOrchestratorService.trackOrder(parseInt(orderId));
      
      if (!trackingResult.success || !trackingResult.formattedText) {
        throw new Error(trackingResult.message || 'Unable to track order');
      }
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, trackingResult.formattedText);
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '\nType "menu" to return to main menu.'
      );
    } catch (error) {
      this.logger.error('Error tracking order:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to track order. Please check the order ID and try again.'
      );
      await this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Show saved addresses using AddressService
   * PHASE 2: Address management integration
   */
  private async showSavedAddresses(phoneNumber: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    if (!authToken) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please login first to view your addresses.'
      );
      return;
    }

    try {
      // Get formatted addresses using address service
      const result = await this.addressService.getFormattedAddresses(authToken);
      
      if (!result.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ ' + (result.message || 'Unable to fetch addresses. Please try again later.')
        );
        await this.showMainMenu(phoneNumber);
        return;
      }
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        result.formattedText + '\n\n' +
        'Reply with:\n' +
        '• Address number to select\n' +
        '• "add" to add new address\n' +
        '• "menu" to return to main menu'
      );
      
      await this.sessionService.setStep(phoneNumber, 'manage_addresses');
    } catch (error) {
      this.logger.error('Error fetching addresses:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to fetch addresses. Please try again later.'
      );
      await this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Handle address management actions
   * PHASE 2: Address selection and addition
   */
  private async handleManageAddresses(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === 'menu') {
      await this.showMainMenu(phoneNumber);
      return;
    }

    if (messageText === 'add') {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '📍 **Add New Address**\n\n' +
        'Please share your location or enter address manually.'
      );
      // TODO: Implement add new address flow
      return;
    }

    // Handle address selection by number
    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    try {
      const addresses = await this.phpAddressService.getAddresses(authToken);
      
      if (!addresses || addresses.length === 0) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Unable to load addresses. Please try again.'
        );
        return;
      }

      const selectedAddress = await this.addressService.selectAddressByIndex(
        addresses, 
        parseInt(messageText)
      );
      
      if (!selectedAddress) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Invalid selection. Please try again.'
        );
        return;
      }

      // Show address details
      const confirmation = this.addressService.formatAddressConfirmation(
        selectedAddress,
        selectedAddress.landmark || ''
      );
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, confirmation);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '\nType "menu" to return to main menu.'
      );
    } catch (error) {
      this.logger.error('Error selecting address:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to select address. Please try again.'
      );
    }
  }

  /**
   * Show wallet menu
   * PHASE 3: Wallet management integration
   */
  private async showWalletMenu(phoneNumber: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    if (!authToken) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please login first to access your wallet.'
      );
      return;
    }

    try {
      // Get wallet balance
      const balanceResult = await this.walletService.getWalletBalance(authToken);
      
      if (balanceResult.success) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          balanceResult.formattedMessage + '\n\n' +
          '1️⃣ Recharge Wallet 💰\n' +
          '2️⃣ Transaction History 📋\n' +
          '3️⃣ View Bonuses 🎁\n' +
          '4️⃣ Back to Main Menu 🏠\n\n' +
          'Reply with the number of your choice:'
        );
        
        await this.sessionService.setStep(phoneNumber, 'wallet_menu');
      } else {
        throw new Error('Unable to fetch wallet balance');
      }
    } catch (error) {
      this.logger.error('Error showing wallet menu:', error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Unable to access wallet. Please try again later.'
      );
      await this.showMainMenu(phoneNumber);
    }
  }

  /**
   * Handle wallet menu selection
   */
  private async handleWalletMenu(phoneNumber: string, messageText: string): Promise<void> {
    const session = await this.sessionService.getSession(phoneNumber);
    const authToken = session.data.auth_token;
    
    switch (messageText) {
      case '1':
        // Recharge wallet
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '💰 **Wallet Recharge**\n\n' +
          'Enter the amount you want to add:\n\n' +
          '• Minimum: ₹10\n' +
          '• Maximum: ₹50,000\n\n' +
          'Example: 500'
        );
        await this.sessionService.setStep(phoneNumber, 'wallet_recharge_amount');
        break;
        
      case '2':
        // Transaction history
        try {
          const historyResult = await this.walletService.getTransactions(authToken, 10);
          
          if (historyResult.success) {
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, historyResult.formattedMessage || '');
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
              phoneNumber,
              '\nType "wallet" to return to wallet menu\nType "menu" for main menu'
            );
          } else {
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
              phoneNumber,
              '❌ Unable to fetch transaction history.'
            );
          }
        } catch (error) {
          this.logger.error('Error fetching transaction history:', error);
          await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
            phoneNumber,
            '❌ Unable to fetch transaction history.'
          );
        }
        break;
        
      case '3':
        // View bonuses
        try {
          const bonusesResult = await this.walletService.getBonuses(authToken);
          
          if (bonusesResult.success) {
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, bonusesResult.formattedMessage || '');
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
              phoneNumber,
              '\nType "wallet" to return to wallet menu\nType "menu" for main menu'
            );
          } else {
            await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
              phoneNumber,
              '❌ Unable to fetch bonuses.'
            );
          }
        } catch (error) {
          this.logger.error('Error fetching bonuses:', error);
          await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
            phoneNumber,
            '❌ Unable to fetch bonuses.'
          );
        }
        break;
        
      case '4':
        // Back to main menu
        await this.showMainMenu(phoneNumber);
        break;
        
      default:
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Invalid option. Please select 1-4.'
        );
        await this.showWalletMenu(phoneNumber);
        break;
    }
  }

  /**
   * STEP 6: Handle module selection
   */
  private async handleModuleSelection(phoneNumber: string, messageText: string): Promise<void> {
    const moduleMap = {
      '1': 'local_delivery',
      '2': 'food_delivery', 
      '3': 'shop',
      '4': 'ambulance',
      '5': 'fruits_vegetables'
    };

    const selectedModule = moduleMap[messageText];
    
    if (!selectedModule) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option (1-5):\n\n' +
        '1️⃣ Local Delivery 🚴‍♂️\n' +
        '2️⃣ Food Delivery 🍔\n' +
        '3️⃣ Shop 🛒\n' +
        '4️⃣ Ambulance 🚑\n' +
        '5️⃣ Fruits & Vegetables 🥬'
      );
      return;
    }

    await this.sessionService.setData(phoneNumber, 'selected_module', selectedModule);

    if (selectedModule === 'local_delivery') {
      await this.startLocalDeliveryFlow(phoneNumber);
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        `🚧 ${selectedModule.replace('_', ' ').toUpperCase()} module is coming soon!\n\n` +
        'For now, please try Local Delivery. Type "1" to continue.'
      );
    }
  }

  /**
   * STEP 7: Start Local Delivery flow
   */
  private async startLocalDeliveryFlow(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '🚴‍♂️ **Local Delivery Service**\n\n' +
      'Choose your delivery method:\n\n' +
      '🚲 **Bike Delivery** - Fast and reliable within city limits\n\n' +
      'Type "bike" to continue with bike delivery:'
    );
    
    await this.sessionService.setStep(phoneNumber, 'local_delivery_start');
  }

  /**
   * Handle Local Delivery start
   */
  private async handleLocalDeliveryStart(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === 'bike') {
      await this.handleBikeDeliveryStart(phoneNumber, '');
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please type "bike" to continue with bike delivery:'
      );
    }
  }

  /**
   * STEP 8: Start Bike Delivery process - Now with saved addresses option
   */
  private async handleBikeDeliveryStart(phoneNumber: string, messageText: string): Promise<void> {
    // Check if user has saved addresses
    const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
    const savedAddresses = await this.phpParcelService.getSavedAddresses(authToken);
    
    if (savedAddresses.success && savedAddresses.data.length > 0) {
      // User has saved addresses - show options
      await this.sessionService.setData(phoneNumber, 'saved_addresses', savedAddresses.data);
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '🚲 **Bike Delivery Selected**\n\n' +
        '📍 **Step 1: Pickup Location**\n\n' +
        'Choose an option:\n\n' +
        '1️⃣ Use saved address 🏠\n' +
        '2️⃣ Share current location 📍\n' +
        '3️⃣ Type new address ✍️\n\n' +
        'Reply with 1, 2, or 3:'
      );
      
      await this.sessionService.setStep(phoneNumber, 'pickup_location_method');
    } else {
      // No saved addresses - show location request directly
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '🚲 **Bike Delivery Selected**\n\n' +
        '📍 **Step 1: Pickup Location**\n\n' +
        'Please share your pickup location for accurate delivery.\n\n' +
        'Tap the button below to send your live location 👇'
      );
      
      await this.sessionService.setStep(phoneNumber, 'pickup_location');
    }
  }

  /**
   * STEP 9: Handle pickup location (with location sharing)
   */
  private async handlePickupLocation(phoneNumber: string, message: any): Promise<void> {
    let pickupLocation = '';
    let coordinates = null;

    // Check if location is shared
    if (message.location) {
      coordinates = {
        lat: message.location.latitude,
        lng: message.location.longitude
      };
      pickupLocation = `Location: ${coordinates.lat},${coordinates.lng}`;
      
      await this.sessionService.setData(phoneNumber, 'pickup_coordinates', coordinates);
    } 
    // Check if text address is provided
    else if (message.text?.body && message.text.body.trim().length > 3) {
      pickupLocation = message.text.body.trim();
    }

    if (!pickupLocation) {
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please provide a valid pickup location.\n\n' +
        'Tap the button below to share your location 📍\n\n' +
        'Or you can type the pickup address like:\n"123 Main Street, Downtown"'
      );
      return;
    }

    await this.sessionService.setData(phoneNumber, 'pickup_location', pickupLocation);
    
    // Ask for landmark for pickup location
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '📍 **Pickup Location Received!**\n\n' +
      'Please provide a landmark or building name to help our driver find you:\n\n' +
      '(Example: "Near ABC Mall" or "Blue Building, 2nd Floor")'
    );
    
    await this.sessionService.setStep(phoneNumber, 'awaiting_pickup_landmark');
  }

  /**
   * STEP 10: Handle delivery location (with location sharing)
   */
  private async handleDeliveryLocation(phoneNumber: string, message: any): Promise<void> {
    let deliveryLocation = '';
    let coordinates = null;

    // Check if location is shared
    if (message.location) {
      coordinates = {
        lat: message.location.latitude,
        lng: message.location.longitude
      };
      deliveryLocation = `Location: ${coordinates.lat},${coordinates.lng}`;
      
      await this.sessionService.setData(phoneNumber, 'delivery_coordinates', coordinates);
    } 
    // Check if text address is provided
    else if (message.text?.body && message.text.body.trim().length > 3) {
      deliveryLocation = message.text.body.trim();
    }

    if (!deliveryLocation) {
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please provide a valid delivery location.\n\n' +
        'Tap the button below to share the location 📍\n\n' +
        'Or you can type the delivery address like:\n"456 Oak Avenue, City Center"'
      );
      return;
    }

    await this.sessionService.setData(phoneNumber, 'delivery_location', deliveryLocation);
    
    // Ask for landmark for delivery location
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '📍 **Delivery Location Received!**\n\n' +
      'Please provide a landmark or building name for the delivery location:\n\n' +
      '(Example: "Opposite XYZ School" or "Green Building, 3rd Floor")'
    );
    
    await this.sessionService.setStep(phoneNumber, 'awaiting_delivery_landmark');
  }

  /**
   * Handle landmark input for pickup or delivery location
   * This helps drivers find the exact location
   */
  private async handleLandmarkInput(phoneNumber: string, messageText: string, type: 'pickup' | 'delivery'): Promise<void> {
    const landmark = messageText.trim();
    
    if (landmark.length < 3) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please provide a valid landmark (at least 3 characters):\n\n' +
        '(Example: "Near ABC Mall" or "Blue Building, 2nd Floor")'
      );
      return;
    }

    // Store landmark
    if (type === 'pickup') {
      await this.sessionService.setData(phoneNumber, 'pickup_landmark', landmark);
      this.logger.log(`📍 Pickup landmark saved: ${landmark}`);
      
      // Now ask for delivery location
      await this.handleDeliveryLocationStart(phoneNumber);
    } else {
      await this.sessionService.setData(phoneNumber, 'delivery_landmark', landmark);
      this.logger.log(`📍 Delivery landmark saved: ${landmark}`);
      
      // Now validate zones
      await this.validateBothZones(phoneNumber);
    }
  }

  /**
   * CRITICAL: Validate zones for both pickup and delivery locations
   * This ensures service availability BEFORE proceeding with order
   */
  private async validateBothZones(phoneNumber: string): Promise<void> {
    try {
      this.logger.log(`🗺️ Validating zones for ${phoneNumber}...`);

      // Get both coordinates from session
      const pickupCoords = await this.sessionService.getData(phoneNumber, 'pickup_coordinates');
      const deliveryCoords = await this.sessionService.getData(phoneNumber, 'delivery_coordinates');

      if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Pickup location not found. Please share your pickup location again.'
        );
        await this.sessionService.setStep(phoneNumber, 'pickup_location');
        return;
      }

      if (!deliveryCoords || !deliveryCoords.lat || !deliveryCoords.lng) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Delivery location not found. Please share delivery location again.'
        );
        await this.sessionService.setStep(phoneNumber, 'delivery_location');
        return;
      }

      // Validate PICKUP zone
      this.logger.log(`📍 Validating pickup zone: ${pickupCoords.lat}, ${pickupCoords.lng}`);
      let pickupZoneResult;
      try {
        pickupZoneResult = await this.phpParcelService.getZoneByLocation(
          pickupCoords.lat,
          pickupCoords.lng
        );
      } catch (error) {
        this.logger.error(`❌ Pickup zone validation failed:`, error);
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Sorry, we don\'t service your pickup area yet.\n\n' +
          'We\'re constantly expanding! 🌍\n\n' +
          'Please try a different pickup location or type "hi" to restart.'
        );
        await this.sessionService.setStep(phoneNumber, 'welcome');
        return;
      }

      // Validate DELIVERY zone
      this.logger.log(`📍 Validating delivery zone: ${deliveryCoords.lat}, ${deliveryCoords.lng}`);
      let deliveryZoneResult;
      try {
        deliveryZoneResult = await this.phpParcelService.getZoneByLocation(
          deliveryCoords.lat,
          deliveryCoords.lng
        );
      } catch (error) {
        this.logger.error(`❌ Delivery zone validation failed:`, error);
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Sorry, we don\'t deliver to that area yet.\n\n' +
          'We\'re constantly expanding! 🌍\n\n' +
          'Please try a different delivery location or type "hi" to restart.'
        );
        await this.sessionService.setStep(phoneNumber, 'welcome');
        return;
      }

      // Check if PARCEL module is available
      if (!pickupZoneResult.parcelModules || pickupZoneResult.parcelModules.length === 0) {
        this.logger.warn(`❌ No parcel module in pickup zone ${pickupZoneResult.primaryZoneId}`);
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ Sorry, parcel delivery service is not available in your pickup area.\n\n' +
          'We\'re working to expand! 🚀\n\n' +
          'Type "hi" to try again with a different location.'
        );
        await this.sessionService.setStep(phoneNumber, 'welcome');
        return;
      }

      // Store zone and module data in session
      const parcelModule = pickupZoneResult.parcelModules[0];
      
      await this.sessionService.setData(phoneNumber, 'pickup_zone_id', pickupZoneResult.primaryZoneId);
      await this.sessionService.setData(phoneNumber, 'pickup_zone_ids', JSON.stringify(pickupZoneResult.zoneIds));
      await this.sessionService.setData(phoneNumber, 'delivery_zone_id', deliveryZoneResult.primaryZoneId);
      await this.sessionService.setData(phoneNumber, 'delivery_zone_ids', JSON.stringify(deliveryZoneResult.zoneIds));
      await this.sessionService.setData(phoneNumber, 'module_id', parcelModule.id);
      await this.sessionService.setData(phoneNumber, 'module_type', parcelModule.module_type);
      await this.sessionService.setData(phoneNumber, 'module_name', parcelModule.module_name);

      this.logger.log(
        `✅ Zones validated! Pickup Zone: ${pickupZoneResult.primaryZoneId}, ` +
        `Delivery Zone: ${deliveryZoneResult.primaryZoneId}, ` +
        `Module: ${parcelModule.module_name} (ID: ${parcelModule.id})`
      );

      // Success! Both zones valid and parcel module available
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        `✅ Great news! We service both locations.\n\n` +
        `📦 Service: ${parcelModule.module_name}\n` +
        `📍 Pickup Zone: ${pickupZoneResult.primaryZoneId}\n` +
        `🎯 Delivery Zone: ${deliveryZoneResult.primaryZoneId}\n\n` +
        `Let\'s continue with your parcel details...`
      );

      // Check if we should ask to save addresses
      const willSave = await this.sessionService.getData(phoneNumber, 'will_save_delivery_address');
      if (willSave && deliveryCoords) {
        // Ask to save this new address
        await this.askToSaveAddress(phoneNumber, 'delivery');
      } else {
        // Proceed directly to parcel details
        await this.proceedToParcelDetails(phoneNumber);
      }

    } catch (error) {
      this.logger.error(`❌ Zone validation error:`, error);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Error checking service availability. Please try again.\n\n' +
        'Type "hi" to restart.'
      );
      await this.sessionService.setStep(phoneNumber, 'welcome');
    }
  }

  /**
   * STEP 11: Handle mandatory fields collection
   */
  private async handleMandatoryFields(phoneNumber: string, messageText: string): Promise<void> {
    const currentField = await this.sessionService.getData(phoneNumber, 'current_field');
    
    switch (currentField) {
      case 'parcel_description':
        await this.handleParcelDescription(phoneNumber, messageText);
        break;
        
      case 'recipient_name':
        await this.handleRecipientName(phoneNumber, messageText);
        break;
        
      case 'recipient_phone':
        await this.handleRecipientPhone(phoneNumber, messageText);
        break;
        
      case 'parcel_weight':
        await this.handleParcelWeight(phoneNumber, messageText);
        break;
        
      default:
        await this.handleParcelDescription(phoneNumber, messageText);
        break;
    }
  }

  private async handleParcelDescription(phoneNumber: string, messageText: string): Promise<void> {
    if (!messageText || messageText.length < 3) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please provide a proper description of your parcel:\n\n' +
        'Example: "Documents", "Food items", "Clothes"'
      );
      return;
    }

    await this.sessionService.setData(phoneNumber, 'parcel_description', messageText);
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '✅ Parcel description saved!\n\n' +
      '2️⃣ **Recipient Name**: Who will receive this parcel?\n\n' +
      'Please enter the recipient\'s full name:'
    );
    
    await this.sessionService.setData(phoneNumber, 'current_field', 'recipient_name');
  }

  private async handleRecipientName(phoneNumber: string, messageText: string): Promise<void> {
    if (!messageText || messageText.length < 2) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid recipient name:\n\n' +
        'Example: "John Doe", "Sarah Smith"'
      );
      return;
    }

    await this.sessionService.setData(phoneNumber, 'recipient_name', messageText);
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '✅ Recipient name saved!\n\n' +
      '3️⃣ **Recipient Phone**: Contact number for delivery updates\n\n' +
      'Please enter the recipient\'s phone number:'
    );
    
    await this.sessionService.setData(phoneNumber, 'current_field', 'recipient_phone');
  }

  private async handleRecipientPhone(phoneNumber: string, messageText: string): Promise<void> {
    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(messageText.replace(/\s/g, ''))) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please enter a valid phone number:\n\n' +
        'Example: +1234567890 or 1234567890'
      );
      return;
    }

    const recipientPhone = messageText.replace(/\s/g, '');
    await this.sessionService.setData(phoneNumber, 'recipient_phone', recipientPhone);
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '✅ Recipient phone saved!\n\n' +
      '4️⃣ **Parcel Weight** (optional): Approximate weight in kg\n\n' +
      'Example: "1 kg", "500g", or type "skip" to continue:'
    );
    
    await this.sessionService.setData(phoneNumber, 'current_field', 'parcel_weight');
  }

  private async handleParcelWeight(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText !== 'skip') {
      await this.sessionService.setData(phoneNumber, 'parcel_weight', messageText);
    }
    
    // All mandatory fields collected, proceed to payment method selection
    await this.proceedToPaymentSelection(phoneNumber);
  }

  /**
   * STEP 11.5: Payment Method Selection
   * Ask user to choose payment method before checkout
   * IMPORTANT: Requires authentication before proceeding
   * UPDATED: Now fetches delivery cost from PHP backend instead of hardcoded calculation
   */
  private async proceedToPaymentSelection(phoneNumber: string): Promise<void> {
    const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
    
    // 🔐 CHECK AUTH FIRST - Cannot proceed without login
    if (!authToken) {
      this.logger.log(`🔐 User ${phoneNumber} not authenticated - redirecting to login`);
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '🔐 **Login Required**\n\n' +
        'To complete your order, please verify your phone number.\n\n' +
        'Please enter your 10-digit mobile number:'
      );
      await this.sessionService.setStep(phoneNumber, 'awaiting_phone_number');
      return;
    }
    
    // Get order data from session
    const orderData = await this.sessionService.getData(phoneNumber);
    const pickupCoords = orderData.pickup_coordinates || {};
    const deliveryCoords = orderData.delivery_coordinates || {};
    const pickupLat = parseFloat(pickupCoords.latitude || pickupCoords.lat || 0);
    const pickupLng = parseFloat(pickupCoords.longitude || pickupCoords.lng || 0);
    const deliveryLat = parseFloat(deliveryCoords.latitude || deliveryCoords.lat || 0);
    const deliveryLng = parseFloat(deliveryCoords.longitude || deliveryCoords.lng || 0);
    
    // Calculate distance via OSRM
    const distance = await this.phpParcelService.calculateDistance(
      pickupLat, pickupLng, deliveryLat, deliveryLng
    );
    
    // Get zone IDs for pricing calculation
    const pickupZoneId = orderData.pickup_zone_id || 1;
    const zoneIds = orderData.pickup_zone_ids ? JSON.parse(orderData.pickup_zone_ids) : [pickupZoneId];
    const categoryId = orderData.category_id || 1;
    
    // Fetch delivery cost from PHP backend (zone-based pricing)
    let estimatedAmount: number;
    let deliveryCharge: number;
    let taxAmount: number = 0;
    
    try {
      this.logger.log(`💰 Fetching delivery cost from PHP: distance=${distance}, category=${categoryId}, zones=${JSON.stringify(zoneIds)}`);
      const shippingResult = await this.phpParcelService.calculateShippingCharge(
        distance,
        categoryId,
        zoneIds
      );
      
      estimatedAmount = shippingResult.total_charge;
      deliveryCharge = shippingResult.delivery_charge;
      taxAmount = shippingResult.tax;
      
      this.logger.log(`✅ PHP delivery cost: ₹${estimatedAmount} (delivery: ₹${deliveryCharge}, tax: ₹${taxAmount})`);
      
      // Store calculated values in session for order placement
      await this.sessionService.setData(phoneNumber, 'calculated_delivery_charge', deliveryCharge);
      await this.sessionService.setData(phoneNumber, 'calculated_tax', taxAmount);
      await this.sessionService.setData(phoneNumber, 'calculated_total', estimatedAmount);
      await this.sessionService.setData(phoneNumber, 'distance', distance);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to fetch delivery cost from PHP, using fallback: ${error.message}`);
      // Fallback to local calculation only if PHP fails
      estimatedAmount = Math.max(50, Math.ceil(distance * 15));
      deliveryCharge = estimatedAmount;
      
      await this.sessionService.setData(phoneNumber, 'calculated_delivery_charge', deliveryCharge);
      await this.sessionService.setData(phoneNumber, 'calculated_total', estimatedAmount);
      await this.sessionService.setData(phoneNumber, 'distance', distance);
    }
    
    // Get wallet balance and determine payment options
    let walletMessage = '';
    if (authToken) {
      try {
        const balanceResult = await this.walletService.getWalletBalance(authToken);
        if (balanceResult.success && balanceResult.balance !== undefined) {
          const walletBalance = balanceResult.balance;
          
          if (walletBalance >= estimatedAmount) {
            // Full wallet payment possible
            walletMessage = `\n3️⃣ Wallet (₹${walletBalance.toFixed(2)} available) 👛`;
          } else if (walletBalance > 0) {
            // Partial payment possible
            const remaining = estimatedAmount - walletBalance;
            walletMessage = `\n3️⃣ Wallet (₹${walletBalance.toFixed(2)}) + Online (₹${remaining.toFixed(2)}) 💡\n   ↳ Use your full wallet balance + pay remaining online`;
          } else {
            // No balance
            walletMessage = `\n3️⃣ Wallet (₹0.00 - Recharge needed) 👛`;
          }
        }
      } catch (error) {
        this.logger.warn(`Could not fetch wallet balance: ${error.message}`);
        walletMessage = '\n3️⃣ Wallet 👛';
      }
    } else {
      walletMessage = '\n3️⃣ Wallet 👛';
    }
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '💳 **Payment Method**\n\n' +
      `Estimated Amount: ₹${estimatedAmount.toFixed(2)}\n\n` +
      'Please choose your payment method:\n\n' +
      '1️⃣ Cash on Delivery 💵\n' +
      '2️⃣ Online Payment (Razorpay) 💳' +
      walletMessage + '\n\n' +
      'Reply with 1, 2, or 3:'
    );
    
    await this.sessionService.setStep(phoneNumber, 'payment_method_selection');
  }

  /**
   * Handle payment method selection
   * UPDATED: Uses pre-calculated delivery cost from PHP backend
   */
  private async handlePaymentMethodSelection(phoneNumber: string, messageText: string): Promise<void> {
    const paymentMap = {
      '1': 'cash_on_delivery',
      '2': 'digital_payment',
      '3': 'wallet'
    };

    const selectedPayment = paymentMap[messageText];
    
    if (!selectedPayment) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid payment option:\n\n' +
        '1️⃣ Cash on Delivery 💵\n' +
        '2️⃣ Online Payment (Razorpay) 💳\n' +
        '3️⃣ Wallet 👛\n\n' +
        'Reply with 1, 2, or 3:'
      );
      return;
    }

    // Store selected payment method
    await this.sessionService.setData(phoneNumber, 'payment_method', selectedPayment);

    // If wallet selected, check balance and determine payment type
    if (selectedPayment === 'wallet') {
      // TODO: Add wallet balance check logic here if needed
      // For now, we assume the user has checked balance in previous step
    }

    try {
      const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
      
      // 🔐 CRITICAL: Check auth before order placement
      if (!authToken) {
        this.logger.warn(`⚠️ Auth token missing for ${phoneNumber} - redirecting to login`);
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '🔐 **Session Expired**\n\n' +
          'Your session has expired. Please log in again to complete your order.\n\n' +
          'Enter your 10-digit mobile number:'
        );
        await this.sessionService.setStep(phoneNumber, 'awaiting_phone_number');
        return;
      }
      
      const orderData = await this.sessionService.getData(phoneNumber);
      
      // Get pre-calculated delivery charge from PHP backend (calculated in proceedToPaymentSelection)
      const deliveryCharge = orderData.calculated_delivery_charge || orderData.calculated_total || 50;
      const distance = orderData.distance || 0;
      
      const pickupCoords = orderData.pickup_coordinates || {};
      const deliveryCoords = orderData.delivery_coordinates || {};
      const pickupLat = parseFloat(pickupCoords.latitude || pickupCoords.lat || 0);
      const pickupLng = parseFloat(pickupCoords.longitude || pickupCoords.lng || 0);
      const deliveryLat = parseFloat(deliveryCoords.latitude || deliveryCoords.lat || 0);
      const deliveryLng = parseFloat(deliveryCoords.longitude || deliveryCoords.lng || 0);
      
      // Only calculate distance if not already stored
      const calculatedDistance = distance || await this.phpParcelService.calculateDistance(
        pickupLat, pickupLng, deliveryLat, deliveryLng
      );
      
      const pickupZoneId = orderData.pickup_zone_id || 1;
      const deliveryZoneId = orderData.delivery_zone_id || 1;
      const selectedModuleId = orderData.module_id || 1;
      const pickupZoneIds = orderData.pickup_zone_ids || null;

      this.logger.log(`📊 Order details: Distance=${calculatedDistance}km, Charge=₹${deliveryCharge}, PickupZone=${pickupZoneId}, DeliveryZone=${deliveryZoneId}`);

      // Prepare order payload for PHP backend
      const orderPayload = {
        // Payment method
        payment_method: selectedPayment, // Use the selected payment method
        
        // Partial payment flag (for wallet + digital payment)
        partial_payment: orderData.partial_payment === true ? 1 : 0,
        
        // Category - default to first category or 1
        category_id: orderData.category_id || 1,
        
        // Recipient details
        receiver_name: orderData.recipient_name,
        receiver_phone: orderData.recipient_phone,
        receiver_email: orderData.recipient_email || `${phoneNumber}@whatsapp.mangwale.com`,
        
        // Delivery location with landmark
        delivery_address: orderData.delivery_location || 'WhatsApp Order',
        delivery_latitude: deliveryLat,
        delivery_longitude: deliveryLng,
        delivery_zone_id: deliveryZoneId,
        delivery_landmark: orderData.delivery_landmark || '',
        receiver_floor: orderData.delivery_floor || '',
        receiver_road: orderData.delivery_road || '',
        receiver_house: orderData.delivery_house || '',
        
        // Pickup location with landmark
        pickup_address: orderData.pickup_location || 'WhatsApp Pickup',
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        pickup_zone_id: pickupZoneId,
        pickup_landmark: orderData.pickup_landmark || '',
        pickup_floor: orderData.pickup_floor || '',
        pickup_road: orderData.pickup_road || '',
        pickup_house: orderData.pickup_house || '',
        
        // Module and zones
        module_id: selectedModuleId,
        zone_ids: pickupZoneIds ? JSON.parse(pickupZoneIds) : [pickupZoneId], // Use zone array
        
        // Distance and charges (from PHP backend calculation)
        distance: calculatedDistance,
        delivery_charge: deliveryCharge,
        dm_tips: 0,
        
        // Order details
        order_note: `Parcel: ${orderData.parcel_description || 'N/A'}. Weight: ${orderData.parcel_weight || 'N/A'}`,
        delivery_instruction: 'WhatsApp Order - Please call recipient before delivery',
      };

      this.logger.log('📤 Sending order to PHP backend...');
      
      // Create order through PHP backend
      const orderResult = await this.phpParcelService.createAuthenticatedOrder(
        authToken, 
        phoneNumber,
        orderPayload
      );

      this.logger.log(`✅ Order creation response:`, orderResult);

      // Check if order was created successfully
      if (orderResult && orderResult.order_id) {
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          `🎉 **ORDER PLACED SUCCESSFULLY!**\n\n` +
          `📋 **Order ID:** #${orderResult.order_id}\n` +
          `💰 **Delivery Cost:** ₹${deliveryCharge}\n` +
          `📏 **Distance:** ${calculatedDistance.toFixed(2)} km\n\n` +
          `📍 **Pickup:** ${orderData.pickup_location}\n` +
          `🎯 **Delivery:** ${orderData.delivery_location}\n` +
          `📦 **Parcel:** ${orderData.parcel_description}\n\n` +
          `🚴‍♂️ A delivery partner will be assigned shortly.\n` +
          `📱 You'll receive real-time updates on WhatsApp.\n\n` +
          `**Next Steps:**\n` +
          `1. Partner will call before pickup\n` +
          `2. Keep your parcel ready\n` +
          `3. Payment: Cash/Online at delivery\n\n` +
          `Thank you for choosing Mangwale! 💚\n\n` +
          `📞 Support: Type "help"\n` +
          `🔄 New Order: Type "hi"`
        );
        
        // Clear order data but keep user authenticated
        await this.sessionService.clearOrderData(phoneNumber);
        
      } else {
        const errorMsg = orderResult?.message || orderResult?.errors?.[0]?.message || 'Unknown error';
        this.logger.error('Order creation failed:', errorMsg);
        
        await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
          phoneNumber,
          '❌ **Order Failed**\n\n' +
          `Reason: ${errorMsg}\n\n` +
          'Please try again:\n' +
          '• Type "confirm" to retry\n' +
          '• Type "cancel" to start over\n' +
          '• Type "help" for support'
        );
      }
      
    } catch (error) {
      this.logger.error('❌ Error creating order:', error);
      this.logger.error('Error stack:', error.stack);
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ **Technical Error**\n\n' +
        'Unable to process your order due to a technical issue.\n\n' +
        `Error: ${error.message}\n\n` +
        'Please try again:\n' +
        '• Type "confirm" to retry\n' +
        '• Type "hi" to start over'
      );
    }
  }

  private async cancelOrder(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '❌ **Order Cancelled**\n\n' +
      'Your order has been cancelled successfully.\n\n' +
      '🔄 Type "hi" to place a new order\n' +
      '📞 Need help? Type "help"'
    );
    
    await this.sessionService.clearOrderData(phoneNumber);
  }

  private async editOrderDetails(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '📝 **Edit Order Details**\n\n' +
      'What would you like to modify?\n\n' +
      '1️⃣ Pickup Location 📍\n' +
      '2️⃣ Delivery Location 🎯\n' +
      '3️⃣ Parcel Description 📦\n' +
      '4️⃣ Recipient Details 👤\n' +
      '5️⃣ Parcel Weight ⚖️\n\n' +
      'Reply with the number (1-5):'
    );
    
    // For now, restart the flow - can be enhanced later
    await this.sessionService.setStep(phoneNumber, 'bike_delivery');
  }

  private async handleUnknownStep(phoneNumber: string): Promise<void> {
    this.logger.warn(`🤷‍♂️ Unknown step for ${phoneNumber}`);
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '🤷‍♂️ Something went wrong. Let\'s start over.\n\n' +
      'Type "hi" to begin a fresh order.'
    );
    await this.sessionService.clearOrderData(phoneNumber);
  }

  /**
   * Handle pickup location method selection (saved/share/type)
   */
  private async handlePickupLocationMethod(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === '1') {
      // Show saved addresses
      await this.showSavedAddressesForLocation(phoneNumber, 'pickup');
    } else if (messageText === '2') {
      // Request live location
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '📍 **Share Your Current Location**\n\n' +
        'Tap the button below to send your live location 👇'
      );
      await this.sessionService.setStep(phoneNumber, 'pickup_location');
      await this.sessionService.setData(phoneNumber, 'will_save_address', true);
    } else if (messageText === '3') {
      // Manual address entry
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '✍️ **Type Your Address**\n\n' +
        'Please type the complete pickup address:\n\n' +
        'Example: "123 Main Street, Downtown, City"'
      );
      await this.sessionService.setStep(phoneNumber, 'pickup_location');
      await this.sessionService.setData(phoneNumber, 'will_save_address', true);
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option:\n\n' +
        '1️⃣ Use saved address 🏠\n' +
        '2️⃣ Share current location 📍\n' +
        '3️⃣ Type new address ✍️'
      );
    }
  }

  /**
   * Handle delivery location method selection
   */
  private async handleDeliveryLocationMethod(phoneNumber: string, messageText: string): Promise<void> {
    if (messageText === '1') {
      // Show saved addresses
      await this.showSavedAddressesForLocation(phoneNumber, 'delivery');
    } else if (messageText === '2') {
      // Request live location
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '📍 **Share Delivery Location**\n\n' +
        'Tap the button below to send the delivery location 👇'
      );
      await this.sessionService.setStep(phoneNumber, 'delivery_location');
      await this.sessionService.setData(phoneNumber, 'will_save_delivery_address', true);
    } else if (messageText === '3') {
      // Manual address entry
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '✍️ **Type Delivery Address**\n\n' +
        'Please type the complete delivery address:\n\n' +
        'Example: "456 Oak Avenue, Business Park"'
      );
      await this.sessionService.setStep(phoneNumber, 'delivery_location');
      await this.sessionService.setData(phoneNumber, 'will_save_delivery_address', true);
    } else {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ Please select a valid option:\n\n' +
        '1️⃣ Use saved address 🏠\n' +
        '2️⸣ Share location 📍\n' +
        '3️⃣ Type address ✍️'
      );
    }
  }

  /**
   * Show saved addresses list for location selection (legacy - used in pickup/delivery flow)
   */
  private async showSavedAddressesForLocation(phoneNumber: string, locationType: 'pickup' | 'delivery'): Promise<void> {
    const savedAddresses = await this.sessionService.getData(phoneNumber, 'saved_addresses');
    
    if (!savedAddresses || savedAddresses.length === 0) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '❌ No saved addresses found.\n\n' +
        'Please share your location or type address manually.'
      );
      return;
    }
    
    // Format address list with emojis
    const addressTypeEmoji = {
      home: '🏡',
      office: '🏢',
      other: '📍'
    };
    
    let addressList = `🏠 **YOUR SAVED ADDRESSES**\n\n`;
    
    savedAddresses.slice(0, 9).forEach((addr, index) => {
      const emoji = addressTypeEmoji[addr.address_type] || '📍';
      addressList += `${index + 1}. ${addr.address_type.toUpperCase()} ${emoji}\n`;
      addressList += `   ${addr.address}\n`;
      if (addr.floor || addr.house) {
        addressList += `   ${addr.house ? 'House: ' + addr.house : ''} ${addr.floor ? 'Floor: ' + addr.floor : ''}\n`;
      }
      addressList += `\n`;
    });
    
    addressList += `Reply with number (1-${Math.min(savedAddresses.length, 9)}):`;
    
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, phoneNumber, addressList);
    await this.sessionService.setStep(phoneNumber, 
      locationType === 'pickup' ? 'pickup_address_selection' : 'delivery_address_selection'
    );
  }

  /**
   * Handle saved address selection
   */
  private async handleAddressSelection(phoneNumber: string, messageText: string, locationType: 'pickup' | 'delivery'): Promise<void> {
    const savedAddresses = await this.sessionService.getData(phoneNumber, 'saved_addresses');
    const selectedIndex = parseInt(messageText) - 1;
    
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= savedAddresses.length) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        `❌ Please select a valid number (1-${Math.min(savedAddresses.length, 9)}):`
      );
      return;
    }
    
    const selectedAddress = savedAddresses[selectedIndex];
    
    // Save selected address data
    if (locationType === 'pickup') {
      await this.sessionService.setData(phoneNumber, {
        pickup_location: selectedAddress.address,
        pickup_coordinates: {
          lat: parseFloat(selectedAddress.latitude),
          lng: parseFloat(selectedAddress.longitude)
        },
        pickup_address_id: selectedAddress.id,
        pickup_contact_person: selectedAddress.contact_person_name,
        pickup_contact_number: selectedAddress.contact_person_number
      });
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        `✅ **Pickup Location Selected!**\n\n` +
        `📍 ${selectedAddress.address_type.toUpperCase()}\n` +
        `${selectedAddress.address}\n\n` +
        `Moving to delivery location...`
      );
      
      // Proceed to delivery location
      await this.handleDeliveryLocationStart(phoneNumber);
    } else {
      await this.sessionService.setData(phoneNumber, {
        delivery_location: selectedAddress.address,
        delivery_coordinates: {
          lat: parseFloat(selectedAddress.latitude),
          lng: parseFloat(selectedAddress.longitude)
        },
        delivery_address_id: selectedAddress.id,
        delivery_contact_person: selectedAddress.contact_person_name,
        delivery_contact_number: selectedAddress.contact_person_number
      });
      
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        `✅ **Delivery Location Selected!**\n\n` +
        `📍 ${selectedAddress.address_type.toUpperCase()}\n` +
        `${selectedAddress.address}\n\n` +
        `Moving to parcel details...`
      );
      
      // Proceed to mandatory fields
      await this.proceedToParcelDetails(phoneNumber);
    }
  }

  /**
   * Handle delivery location start (with saved addresses option)
   */
  private async handleDeliveryLocationStart(phoneNumber: string): Promise<void> {
    const savedAddresses = await this.sessionService.getData(phoneNumber, 'saved_addresses');
    
    if (savedAddresses && savedAddresses.length > 0) {
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '📍 **Step 2: Delivery Location**\n\n' +
        'Choose an option:\n\n' +
        '1️⃣ Use saved address 🏠\n' +
        '2️⃣ Share location 📍\n' +
        '3️⃣ Type address ✍️\n\n' +
        'Reply with 1, 2, or 3:'
      );
      
      await this.sessionService.setStep(phoneNumber, 'delivery_location_method');
    } else {
      await this.messagingService.sendLocationRequest(Platform.WHATSAPP, 
        phoneNumber,
        '📍 **Step 2: Delivery Location**\n\n' +
        'Share where the parcel should be delivered.\n\n' +
        'Tap the button below 👇'
      );
      
      await this.sessionService.setStep(phoneNumber, 'delivery_location');
    }
  }

  /**
   * Proceed to parcel details after location is set
   */
  private async proceedToParcelDetails(phoneNumber: string): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '✅ Delivery location saved!\n\n' +
      '📋 **Step 3: Mandatory Fields**\n\n' +
      'Please provide the following details:\n\n' +
      '1️⃣ **Parcel Description**: What are you sending?\n\n' +
      'Example: "Documents", "Food items", "Electronics"'
    );
    
    await this.sessionService.setStep(phoneNumber, 'mandatory_fields');
    await this.sessionService.setData(phoneNumber, 'current_field', 'parcel_description');
  }

  /**
   * Ask if user wants to save the address
   */
  private async askToSaveAddress(phoneNumber: string, locationType: 'pickup' | 'delivery'): Promise<void> {
    await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
      phoneNumber,
      '💾 **Save this address?**\n\n' +
      'Would you like to save this address for future use?\n\n' +
      '✅ Type "yes" to save\n' +
      '❌ Type "no" to skip'
    );
    
    await this.sessionService.setData(phoneNumber, 'pending_save_location_type', locationType);
    await this.sessionService.setStep(phoneNumber, 'confirm_save_address');
  }

  /**
   * Handle save address confirmation
   */
  private async handleSaveAddressConfirmation(phoneNumber: string, messageText: string): Promise<void> {
    const locationType = await this.sessionService.getData(phoneNumber, 'pending_save_location_type');
    
    if (messageText === 'yes') {
      // Ask for address type
      await this.messagingService.sendTextMessage(Platform.WHATSAPP, 
        phoneNumber,
        '🏠 **Address Type**\n\n' +
        'What type of address is this?\n\n' +
        '1️⃣ Home 🏡\n' +
        '2️⃣ Office 🏢\n' +
        '3️⃣ Other 📍\n\n' +
        'Reply with 1, 2, or 3:'
      );
      
      await this.sessionService.setStep(phoneNumber, 'select_address_type');
    } else {
      // Skip saving, proceed
      await this.proceedAfterLocation(phoneNumber, locationType);
    }
  }

  /**
   * Handle address type selection and save
   * Using clean architecture: AddressService (Layer 2) + PhpAddressService (Layer 1)
   */
  private async handleAddressTypeSave(phoneNumber: string, messageText: string): Promise<void> {
    const addressTypeMap = {
      '1': 'home',
      '2': 'office',
      '3': 'other'
    };
    
    const addressType = addressTypeMap[messageText] as 'home' | 'office' | 'other';
    
    if (!addressType) {
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        '❌ Please select 1, 2, or 3'
      );
      return;
    }
    
    const locationType = await this.sessionService.getData(phoneNumber, 'pending_save_location_type');
    const locationKey = locationType === 'pickup' ? 'pickup' : 'delivery';
    
    const address = await this.sessionService.getData(phoneNumber, `${locationKey}_location`);
    const coordinates = await this.sessionService.getData(phoneNumber, `${locationKey}_coordinates`);
    const userInfo = await this.sessionService.getData(phoneNumber, 'user_info');
    const authToken = await this.sessionService.getData(phoneNumber, 'auth_token');
    
    // Save address using clean architecture (Layer 2: AddressService)
    const result = await this.addressService.saveAddress(authToken, {
      contactPersonName: userInfo.name || `${userInfo.f_name} ${userInfo.l_name}`,
      contactPersonNumber: userInfo.phone,
      addressType: addressType,
      address: address,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    });
    
    if (result.success) {
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        `✅ **Address Saved!**\n\n` +
        `Your ${addressType} address has been saved for future orders.\n\n` +
        `Continuing with your order...`
      );
      
      // Refresh saved addresses list for next time using AddressService
      const updatedAddresses = await this.addressService.getFormattedAddresses(authToken);
      if (updatedAddresses.success && updatedAddresses.addresses) {
        await this.sessionService.setData(phoneNumber, 'saved_addresses', updatedAddresses.addresses);
      }
    } else {
      await this.messagingService.sendTextMessage(
        Platform.WHATSAPP,
        phoneNumber,
        `⚠️ Could not save address, but continuing with your order...`
      );
    }
    
    // Proceed with flow
    await this.proceedAfterLocation(phoneNumber, locationType);
  }

  /**
   * Proceed after location is set (with or without saving)
   */
  private async proceedAfterLocation(phoneNumber: string, locationType: 'pickup' | 'delivery'): Promise<void> {
    if (locationType === 'pickup') {
      await this.handleDeliveryLocationStart(phoneNumber);
    } else {
      await this.proceedToParcelDetails(phoneNumber);
    }
  }

  private async handleWalletInsufficientAction(phoneNumber: string, messageText: string): Promise<void> {
    this.logger.warn(`handleWalletInsufficientAction not implemented`);
    await this.showMainMenu(phoneNumber);
  }

  private async handleWalletPartialPaymentChoice(phoneNumber: string, messageText: string): Promise<void> {
    this.logger.warn(`handleWalletPartialPaymentChoice not implemented`);
    await this.showMainMenu(phoneNumber);
  }

  private async handleWalletRechargeSuggestionChoice(phoneNumber: string, messageText: string): Promise<void> {
    this.logger.warn(`handleWalletRechargeSuggestionChoice not implemented`);
    await this.showMainMenu(phoneNumber);
  }

  private async handleWalletRechargeAmount(phoneNumber: string, messageText: string): Promise<void> {
    this.logger.warn(`handleWalletRechargeAmount not implemented`);
    await this.showMainMenu(phoneNumber);
  }

  private async handleCheckout(phoneNumber: string, messageText: string): Promise<void> {
    this.logger.log(`🛒 Handling checkout for ${phoneNumber}`);
    await this.proceedToPaymentSelection(phoneNumber);
  }
}