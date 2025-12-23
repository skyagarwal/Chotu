/**
 * Auth Flow Bridge - Transition from legacy ConversationService to Flow Engine
 * 
 * This service provides a bridge to gradually deprecate the legacy auth handling
 * in ConversationService and route auth-related requests to the new auth.flow.ts
 * 
 * PHASE 1: Log warnings when legacy auth is used
 * PHASE 2: Route new sessions to flow engine
 * PHASE 3: Remove legacy code entirely
 * 
 * Usage:
 * - Import this service in ConversationService
 * - Call shouldUseFlowEngine() before legacy auth handling
 * - If true, delegate to FlowEngineService.startFlow('auth_flow', context)
 * 
 * @deprecated Legacy auth steps will be removed in v2.0.0
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../../session/session.service';

@Injectable()
export class AuthFlowBridgeService {
  private readonly logger = new Logger(AuthFlowBridgeService.name);
  
  // Feature flag to control migration
  private readonly useFlowEngine: boolean;
  
  // List of legacy auth steps that should be migrated
  private readonly legacyAuthSteps = [
    'login_method',
    'awaiting_phone_number',
    'registration_choice',
    'awaiting_registration_otp',
    'phone_check',
    'awaiting_otp',
    'awaiting_name',
    'awaiting_email',
    'facebook_login',
  ];
  
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    // Feature flag: USE_AUTH_FLOW_ENGINE
    // Set to 'true' to route new auth sessions to flow engine
    // Set to 'false' to use legacy ConversationService auth (default)
    this.useFlowEngine = this.configService.get('USE_AUTH_FLOW_ENGINE', 'false') === 'true';
    
    if (this.useFlowEngine) {
      this.logger.log('✨ Auth Flow Engine ENABLED - New auth sessions will use flow engine');
    } else {
      this.logger.log('⚠️ Auth Flow Engine DISABLED - Using legacy ConversationService auth');
    }
  }
  
  /**
   * Check if the current step is a legacy auth step
   */
  isLegacyAuthStep(step: string): boolean {
    return this.legacyAuthSteps.includes(step);
  }
  
  /**
   * Determine if flow engine should be used for auth
   * 
   * @param phoneNumber - User's phone number (session identifier)
   * @param currentStep - Current session step
   * @returns true if should use flow engine, false for legacy
   */
  async shouldUseFlowEngine(phoneNumber: string, currentStep: string): Promise<boolean> {
    // If feature flag is off, always use legacy
    if (!this.useFlowEngine) {
      // Log deprecation warning for visibility
      if (this.isLegacyAuthStep(currentStep)) {
        this.logger.warn(
          `📢 DEPRECATED: Legacy auth step "${currentStep}" for ${phoneNumber}. ` +
          `Set USE_AUTH_FLOW_ENGINE=true to use new flow engine auth.`
        );
      }
      return false;
    }
    
    // Check if user already has an active flow session
    const session = await this.sessionService.getSession(phoneNumber);
    const activeFlowId = session?.data?.active_flow_id;
    
    if (activeFlowId === 'auth_flow') {
      // Already in auth flow - continue with flow engine
      return true;
    }
    
    // For new auth sessions, check if this is a fresh auth attempt
    if (this.isLegacyAuthStep(currentStep)) {
      // Check if this is a new session (no previous auth attempts)
      const hasLegacyAuthData = session?.data?.login_method || session?.data?.otp_phone;
      
      if (!hasLegacyAuthData) {
        // New session - use flow engine
        this.logger.log(`🚀 Routing new auth session to flow engine: ${phoneNumber}`);
        return true;
      } else {
        // Existing session with legacy data - continue with legacy for this session
        this.logger.log(`📌 Continuing legacy auth session: ${phoneNumber}`);
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Map legacy session step to flow state
   * Used when migrating mid-session from legacy to flow engine
   */
  mapLegacyStepToFlowState(legacyStep: string): string {
    const stepMapping: Record<string, string> = {
      'login_method': 'init',
      'awaiting_phone_number': 'request_phone',
      'registration_choice': 'request_phone',
      'awaiting_registration_otp': 'await_otp',
      'phone_check': 'request_phone',
      'awaiting_otp': 'await_otp',
      'awaiting_name': 'await_name',
      'awaiting_email': 'await_email',
      'facebook_login': 'init', // Not supported in new flow
    };
    
    return stepMapping[legacyStep] || 'init';
  }
  
  /**
   * Map legacy session data to flow context
   * Used when migrating mid-session from legacy to flow engine
   */
  mapLegacyDataToFlowContext(sessionData: Record<string, any>): Record<string, any> {
    return {
      phoneNumber: sessionData.otp_phone || sessionData.auth_phone,
      authToken: sessionData.auth_token,
      isAuthenticated: sessionData.authenticated || false,
      userName: sessionData.user_name || sessionData.temp_user_name,
      userEmail: sessionData.user_email,
      isRegistration: sessionData.is_registration || false,
      awaitingPersonalInfo: sessionData.awaiting_personal_info || false,
      userId: sessionData.user_id,
      phpUserId: sessionData.user_info?.id,
    };
  }
  
  /**
   * Get statistics on legacy auth usage
   * Useful for monitoring migration progress
   */
  getDeprecationStats(): {
    legacyStepsCount: number;
    legacySteps: string[];
    featureFlagEnabled: boolean;
  } {
    return {
      legacyStepsCount: this.legacyAuthSteps.length,
      legacySteps: this.legacyAuthSteps,
      featureFlagEnabled: this.useFlowEngine,
    };
  }
}
