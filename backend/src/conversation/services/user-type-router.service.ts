import { Injectable, Logger } from '@nestjs/common';
import { SessionService } from '../../session/session.service';
import { UserTypeDetectorService, UserTypeResult } from '../../php-integration/services/user-type-detector.service';
import { FlowEngineService } from '../../flow-engine/flow-engine.service';
import { YamlV2FlowLoaderService } from '../../flow-engine/services/yaml-v2-flow-loader.service';
import { MessagingService } from '../../messaging/services/messaging.service';

/**
 * User Type Router Service
 * 
 * Routes users to appropriate flows based on their detected type:
 * - Customer → Customer flows (auth, ordering, tracking)
 * - Vendor → Vendor flows (order management, menu)
 * - Delivery Man → Delivery flows (orders, earnings)
 * - Multi-role → Role selection prompt
 * 
 * This integrates the UserTypeDetectorService with the Flow Engine
 * to enable vendor/driver flows via WhatsApp.
 */
@Injectable()
export class UserTypeRouterService {
  private readonly logger = new Logger(UserTypeRouterService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly userTypeDetector: UserTypeDetectorService,
    private readonly flowEngine: FlowEngineService,
    private readonly yamlV2Loader: YamlV2FlowLoaderService,
    private readonly messagingService: MessagingService,
  ) {
    this.logger.log('🚦 User Type Router initialized');
  }

  /**
   * Detect user type and route to appropriate flow
   * 
   * @param phoneNumber - User's phone number
   * @param sessionId - Current session ID
   * @returns The flow to start, or null if needs role selection
   */
  async detectAndRoute(phoneNumber: string, sessionId: string): Promise<{
    userType: string;
    needsRoleSelection: boolean;
    availableRoles: string[];
    flow?: string;
    userData?: any;
  }> {
    this.logger.log(`🔍 Detecting user type for: ${phoneNumber}`);

    try {
      // Detect user type from PHP backend
      const userTypeResult = await this.userTypeDetector.detectUserType(phoneNumber);

      this.logger.log(`📋 User type result: ${JSON.stringify({
        phone: userTypeResult.phone,
        isCustomer: userTypeResult.isCustomer,
        isVendor: userTypeResult.isVendor,
        isDeliveryMan: userTypeResult.isDeliveryMan,
        recommended: userTypeResult.recommendedType,
        roles: userTypeResult.availableRoles,
      })}`);

      // Save to session
      await this.sessionService.updateSession(sessionId, {
        data: {
          userTypeResult,
          detectedAt: new Date().toISOString(),
        },
      });

      // Check if user has multiple roles
      if (userTypeResult.availableRoles.length > 1) {
        this.logger.log(`👥 User has multiple roles: ${userTypeResult.availableRoles.join(', ')}`);
        
        return {
          userType: 'multi_role',
          needsRoleSelection: true,
          availableRoles: userTypeResult.availableRoles,
          userData: {
            customer: userTypeResult.customer,
            vendor: userTypeResult.vendor,
            deliveryMan: userTypeResult.deliveryMan,
          },
        };
      }

      // Single role or new user
      const userType = userTypeResult.recommendedType;
      const flowId = this.getFlowForUserType(userType);

      return {
        userType,
        needsRoleSelection: false,
        availableRoles: userTypeResult.availableRoles,
        flow: flowId,
        userData: this.getUserData(userTypeResult),
      };

    } catch (error) {
      this.logger.error(`❌ User type detection failed: ${error.message}`);
      
      // Default to new user / customer flow
      return {
        userType: 'new_user',
        needsRoleSelection: false,
        availableRoles: [],
        flow: 'auth_v1',
      };
    }
  }

  /**
   * Process role selection from user
   */
  async processRoleSelection(
    phoneNumber: string,
    sessionId: string,
    selection: string
  ): Promise<{ userType: string; flow: string }> {
    const session = await this.sessionService.getSession(sessionId);
    const userTypeResult = session?.data?.userTypeResult as UserTypeResult;

    if (!userTypeResult) {
      throw new Error('No user type result in session');
    }

    // Map selection to role
    let selectedRole: 'customer' | 'vendor' | 'delivery_man';
    
    if (selection === '1' || selection.toLowerCase().includes('customer') || selection.toLowerCase().includes('order')) {
      selectedRole = 'customer';
    } else if (selection === '2' || selection.toLowerCase().includes('vendor') || selection.toLowerCase().includes('store')) {
      selectedRole = 'vendor';
    } else if (selection === '3' || selection.toLowerCase().includes('delivery') || selection.toLowerCase().includes('driver')) {
      selectedRole = 'delivery_man';
    } else {
      // Default to recommended
      selectedRole = userTypeResult.recommendedType as any || 'customer';
    }

    // Save selected role
    await this.sessionService.updateSession(sessionId, {
      data: {
        ...session?.data,
        selectedRole,
        userType: selectedRole,
      },
    });

    const flowId = this.getFlowForUserType(selectedRole);

    this.logger.log(`✅ Role selected: ${selectedRole} → Flow: ${flowId}`);

    return {
      userType: selectedRole,
      flow: flowId,
    };
  }

  /**
   * Get flow ID for user type
   */
  private getFlowForUserType(userType: string): string {
    const flowMap: Record<string, string> = {
      customer: 'auth_v1',
      vendor: 'vendor_auth_v1',
      delivery_man: 'delivery_auth_v1',
      new_user: 'auth_v1',
    };

    return flowMap[userType] || 'auth_v1';
  }

  /**
   * Get user-specific data for context
   */
  private getUserData(result: UserTypeResult): any {
    switch (result.recommendedType) {
      case 'customer':
        return result.customer;
      case 'vendor':
        return result.vendor;
      case 'delivery_man':
        return result.deliveryMan;
      default:
        return null;
    }
  }

  /**
   * Generate role selection message
   */
  generateRoleSelectionMessage(
    result: UserTypeResult,
    language: 'en' | 'hi' | 'mr' = 'en'
  ): { text: string; buttons: Array<{ id: string; title: string }> } {
    const messages = {
      en: {
        greeting: `Hello! 👋 I see you have multiple accounts with us.`,
        question: `How would you like to continue today?`,
      },
      hi: {
        greeting: `नमस्ते! 👋 मुझे दिखता है कि आपके पास हमारे साथ कई खाते हैं।`,
        question: `आज आप कैसे जारी रखना चाहेंगे?`,
      },
      mr: {
        greeting: `नमस्कार! 👋 मला दिसते की तुमच्याकडे आमच्याकडे अनेक खाती आहेत.`,
        question: `आज तुम्ही कसे पुढे जाऊ इच्छिता?`,
      },
    };

    const msg = messages[language];
    const buttons: Array<{ id: string; title: string }> = [];

    if (result.isCustomer) {
      buttons.push({
        id: 'role_customer',
        title: language === 'en' ? '🛒 Order Food' : 
               language === 'hi' ? '🛒 खाना ऑर्डर करें' : '🛒 जेवण ऑर्डर करा',
      });
    }

    if (result.isVendor) {
      const storeName = result.vendor?.storeName || 'Store';
      buttons.push({
        id: 'role_vendor',
        title: language === 'en' ? `🏪 Manage ${storeName}` :
               language === 'hi' ? `🏪 ${storeName} प्रबंधित करें` : `🏪 ${storeName} व्यवस्थापित करा`,
      });
    }

    if (result.isDeliveryMan) {
      buttons.push({
        id: 'role_delivery',
        title: language === 'en' ? '🚴 My Deliveries' :
               language === 'hi' ? '🚴 मेरी डिलीवरी' : '🚴 माझ्या डिलिव्हरी',
      });
    }

    return {
      text: `${msg.greeting}\n\n${msg.question}`,
      buttons,
    };
  }

  /**
   * Start flow for user type
   */
  async startFlowForUserType(
    phoneNumber: string,
    sessionId: string,
    userType: string,
    initialContext?: Record<string, any>
  ): Promise<any> {
    const flowId = this.getFlowForUserType(userType);

    this.logger.log(`🚀 Starting flow ${flowId} for ${userType} user: ${phoneNumber}`);

    try {
      const result = await this.flowEngine.startFlow(flowId, {
        sessionId,
        phoneNumber,
        initialContext: {
          userType,
          ...initialContext,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to start flow ${flowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if phone is vendor or driver (quick check)
   */
  async isVendorOrDriver(phoneNumber: string): Promise<{
    isVendor: boolean;
    isDeliveryMan: boolean;
    vendorData?: any;
    deliveryData?: any;
  }> {
    try {
      const result = await this.userTypeDetector.detectUserType(phoneNumber);
      return {
        isVendor: result.isVendor,
        isDeliveryMan: result.isDeliveryMan,
        vendorData: result.vendor,
        deliveryData: result.deliveryMan,
      };
    } catch {
      return { isVendor: false, isDeliveryMan: false };
    }
  }
}
