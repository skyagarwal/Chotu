import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhpApiService } from './php-api.service';

/**
 * User Type Detection Result
 * A single phone number can be registered as multiple user types
 */
export interface UserTypeResult {
  phone: string;
  isCustomer: boolean;
  isVendor: boolean;
  isDeliveryMan: boolean;
  
  // Customer details (if exists)
  customer?: {
    id: number;
    name: string;
    hasActiveOrders: boolean;
  };
  
  // Vendor details (if exists)
  vendor?: {
    id: number;
    storeName: string;
    vendorType: 'owner' | 'employee';
    hasActiveOrders: boolean;
    storeId: number;
  };
  
  // Delivery man details (if exists)
  deliveryMan?: {
    id: number;
    name: string;
    isOnline: boolean;
    hasActiveDeliveries: boolean;
  };
  
  // Recommended user type based on context
  recommendedType: 'customer' | 'vendor' | 'delivery_man' | 'new_user';
  
  // Multiple roles available
  availableRoles: ('customer' | 'vendor' | 'delivery_man')[];
}

/**
 * User Type Detector Service
 * 
 * This service detects what type of user is messaging the bot
 * by checking the phone number against:
 * 1. Customer database
 * 2. Vendor database (store owners + employees)
 * 3. Delivery man database
 * 
 * Flow:
 * 1. User sends message to WhatsApp bot
 * 2. Bot extracts phone number
 * 3. UserTypeDetector checks all databases
 * 4. Returns what roles this phone has
 * 5. If multiple roles, bot asks "Are you ordering or managing your store?"
 */
@Injectable()
export class UserTypeDetectorService extends PhpApiService {
  protected logger = new Logger(UserTypeDetectorService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Detect user type from phone number
   * Checks customer, vendor, and delivery man databases
   */
  async detectUserType(phone: string): Promise<UserTypeResult> {
    try {
      this.logger.log(`🔍 Detecting user type for phone: ${phone}`);

      // Normalize phone number
      const normalizedPhone = this.normalizePhone(phone);

      // Check all user types in parallel
      const [customerResult, vendorResult, deliveryManResult] = await Promise.all([
        this.checkIfCustomer(normalizedPhone),
        this.checkIfVendor(normalizedPhone),
        this.checkIfDeliveryMan(normalizedPhone),
      ]);

      const result: UserTypeResult = {
        phone: normalizedPhone,
        isCustomer: customerResult.exists,
        isVendor: vendorResult.exists,
        isDeliveryMan: deliveryManResult.exists,
        customer: customerResult.data,
        vendor: vendorResult.data,
        deliveryMan: deliveryManResult.data,
        availableRoles: [],
        recommendedType: 'new_user',
      };

      // Build available roles
      if (result.isCustomer) result.availableRoles.push('customer');
      if (result.isVendor) result.availableRoles.push('vendor');
      if (result.isDeliveryMan) result.availableRoles.push('delivery_man');

      // Determine recommended type based on context
      result.recommendedType = this.determineRecommendedType(result);

      this.logger.log(
        `✅ User type detected: ${JSON.stringify({
          phone: normalizedPhone,
          roles: result.availableRoles,
          recommended: result.recommendedType,
        })}`
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to detect user type: ${error.message}`);
      return {
        phone,
        isCustomer: false,
        isVendor: false,
        isDeliveryMan: false,
        availableRoles: [],
        recommendedType: 'new_user',
      };
    }
  }

  /**
   * Check if phone is registered as a customer
   */
  private async checkIfCustomer(phone: string): Promise<{
    exists: boolean;
    data?: {
      id: number;
      name: string;
      hasActiveOrders: boolean;
    };
  }> {
    try {
      // Try to get customer info by phone
      const response: any = await this.post('/api/v1/auth/check-phone', {
        phone,
        type: 'customer',
      });

      if (response && response.exists) {
        return {
          exists: true,
          data: {
            id: response.id,
            name: response.name || response.f_name,
            hasActiveOrders: response.has_active_orders || false,
          },
        };
      }
      return { exists: false };
    } catch (error) {
      // Phone not found = not a customer
      this.logger.debug(`Phone ${phone} not found as customer`);
      return { exists: false };
    }
  }

  /**
   * Check if phone is registered as a vendor
   */
  private async checkIfVendor(phone: string): Promise<{
    exists: boolean;
    data?: {
      id: number;
      storeName: string;
      vendorType: 'owner' | 'employee';
      hasActiveOrders: boolean;
      storeId: number;
    };
  }> {
    try {
      // Try to check vendor by phone
      const response: any = await this.post('/api/v1/auth/check-phone', {
        phone,
        type: 'vendor',
      });

      if (response && response.exists) {
        return {
          exists: true,
          data: {
            id: response.id,
            storeName: response.store_name || response.restaurant_name,
            vendorType: response.vendor_type || 'owner',
            hasActiveOrders: response.has_active_orders || false,
            storeId: response.store_id || response.restaurant_id,
          },
        };
      }
      return { exists: false };
    } catch (error) {
      this.logger.debug(`Phone ${phone} not found as vendor`);
      return { exists: false };
    }
  }

  /**
   * Check if phone is registered as a delivery man
   */
  private async checkIfDeliveryMan(phone: string): Promise<{
    exists: boolean;
    data?: {
      id: number;
      name: string;
      isOnline: boolean;
      hasActiveDeliveries: boolean;
    };
  }> {
    try {
      const response: any = await this.post('/api/v1/auth/check-phone', {
        phone,
        type: 'delivery_man',
      });

      if (response && response.exists) {
        return {
          exists: true,
          data: {
            id: response.id,
            name: response.name || `${response.f_name} ${response.l_name}`,
            isOnline: response.is_online || response.active === 1,
            hasActiveDeliveries: response.has_active_deliveries || false,
          },
        };
      }
      return { exists: false };
    } catch (error) {
      this.logger.debug(`Phone ${phone} not found as delivery man`);
      return { exists: false };
    }
  }

  /**
   * Determine the recommended user type based on context
   * Priority: 
   * 1. If only one role, use that
   * 2. If vendor has active orders, recommend vendor
   * 3. If delivery man has active deliveries, recommend delivery_man
   * 4. If customer has active orders, recommend customer
   * 5. Default to customer if registered
   */
  private determineRecommendedType(
    result: UserTypeResult
  ): 'customer' | 'vendor' | 'delivery_man' | 'new_user' {
    const { availableRoles, vendor, deliveryMan, customer } = result;

    // New user - no roles
    if (availableRoles.length === 0) {
      return 'new_user';
    }

    // Single role - easy choice
    if (availableRoles.length === 1) {
      return availableRoles[0];
    }

    // Multiple roles - use context
    // Priority: Active work > Recent activity > Default

    // Check if vendor has active orders (most urgent)
    if (vendor?.hasActiveOrders) {
      return 'vendor';
    }

    // Check if delivery man has active deliveries
    if (deliveryMan?.hasActiveDeliveries) {
      return 'delivery_man';
    }

    // Check if customer has active orders
    if (customer?.hasActiveOrders) {
      return 'customer';
    }

    // Default: If vendor exists, prioritize (business users more valuable)
    if (result.isVendor) {
      return 'vendor';
    }

    // Default to customer
    return 'customer';
  }

  /**
   * Normalize phone number to standard format
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Add India country code if not present (10 digit number)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    return cleaned;
  }

  /**
   * Generate role selection prompt for users with multiple roles
   */
  generateRoleSelectionPrompt(result: UserTypeResult, language: 'en' | 'hi' | 'mr' = 'en'): string {
    const prompts = {
      en: {
        greeting: `Hello! I see you have multiple accounts with us.`,
        question: `How would you like to continue today?`,
        customer: `🛒 Order food as a customer`,
        vendor: `🏪 Manage my store (${result.vendor?.storeName || 'Store'})`,
        delivery: `🚴 Check deliveries (Delivery Partner)`,
      },
      hi: {
        greeting: `नमस्ते! मुझे दिखता है कि आपके पास हमारे साथ कई खाते हैं।`,
        question: `आज आप कैसे जारी रखना चाहेंगे?`,
        customer: `🛒 ग्राहक के रूप में खाना ऑर्डर करें`,
        vendor: `🏪 मेरी दुकान प्रबंधित करें (${result.vendor?.storeName || 'दुकान'})`,
        delivery: `🚴 डिलीवरी देखें (डिलीवरी पार्टनर)`,
      },
      mr: {
        greeting: `नमस्कार! मला दिसते की तुमच्याकडे आमच्याकडे अनेक खाती आहेत.`,
        question: `आज तुम्ही कसे पुढे जाऊ इच्छिता?`,
        customer: `🛒 ग्राहक म्हणून खाद्य ऑर्डर करा`,
        vendor: `🏪 माझे दुकान व्यवस्थापित करा (${result.vendor?.storeName || 'दुकान'})`,
        delivery: `🚴 डिलिव्हरी तपासा (डिलिव्हरी पार्टनर)`,
      },
    };

    const p = prompts[language];
    let message = `${p.greeting}\n\n${p.question}\n\n`;

    let optionNum = 1;
    if (result.isCustomer) {
      message += `${optionNum}. ${p.customer}\n`;
      optionNum++;
    }
    if (result.isVendor) {
      message += `${optionNum}. ${p.vendor}\n`;
      optionNum++;
    }
    if (result.isDeliveryMan) {
      message += `${optionNum}. ${p.delivery}\n`;
    }

    return message;
  }
}
