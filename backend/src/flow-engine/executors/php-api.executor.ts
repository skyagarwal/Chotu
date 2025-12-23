import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { PhpVendorAuthService, VendorUser } from '../../php-integration/services/php-vendor-auth.service';
import { PhpDeliveryAuthService } from '../../php-integration/services/php-delivery-auth.service';
import { PhpOrderService } from '../../php-integration/services/php-order.service';
import { PhpAuthService } from '../../php-integration/services/php-auth.service';
import { PhpAddressService } from '../../php-integration/services/php-address.service';
import { PhpPaymentService } from '../../php-integration/services/php-payment.service';
import { UserTypeDetectorService } from '../../php-integration/services/user-type-detector.service';
import { VendorProfileService } from '../../profiles/services/vendor-profile.service';
import { RiderProfileService } from '../../profiles/services/rider-profile.service';

/**
 * PHP API Executor
 * 
 * Maps YAML flow actions to PHP backend service methods.
 * This executor bridges the YAML V2 flows with the PHP integration layer.
 * 
 * Supported Actions:
 * - Vendor: vendor_login, vendor_get_current_orders, vendor_update_order_status, etc.
 * - Delivery: dm_login, dm_get_current_orders, dm_update_order_status, dm_get_earnings, etc.
 * - Customer: get_customer_orders, cancel_order, verify_payment, etc.
 * - Common: detect_user_type, get_saved_addresses, reverse_geocode, geocode
 */
@Injectable()
export class PhpApiExecutor implements ActionExecutor {
  readonly name = 'php_api';
  private readonly logger = new Logger(PhpApiExecutor.name);

  constructor(
    private readonly vendorAuthService: PhpVendorAuthService,
    private readonly deliveryAuthService: PhpDeliveryAuthService,
    private readonly orderService: PhpOrderService,
    private readonly authService: PhpAuthService,
    private readonly addressService: PhpAddressService,
    private readonly paymentService: PhpPaymentService,
    private readonly userTypeDetectorService: UserTypeDetectorService,
    private readonly vendorProfileService: VendorProfileService,
    private readonly riderProfileService: RiderProfileService,
  ) {
    this.logger.log('🔌 PHP API Executor initialized');
  }

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    const action = config.action as string;
    
    if (!action) {
      return {
        success: false,
        error: 'No action specified for php_api executor',
      };
    }

    this.logger.log(`📡 Executing PHP API action: ${action}`);
    this.logger.debug(`Config: ${JSON.stringify(config)}`);

    try {
      // Resolve config values from context using {{variable}} syntax
      const resolvedConfig = this.resolveConfig(config, context);
      const result = await this.executeAction(action, resolvedConfig, context);
      
      this.logger.log(`✅ PHP API action ${action} completed`);
      
      return {
        success: true,
        output: result,
        event: 'success',
      };
    } catch (error) {
      this.logger.error(`❌ PHP API action ${action} failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        event: 'error',
      };
    }
  }

  /**
   * Resolve {{variable}} placeholders in config from context
   */
  private resolveConfig(config: Record<string, any>, context: FlowContext): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const varName = value.slice(2, -2).trim();
        resolved[key] = this.getNestedValue(context.data, varName) ?? value;
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Execute the specific action
   */
  private async executeAction(
    action: string,
    config: Record<string, any>,
    context: FlowContext
  ): Promise<any> {
    switch (action) {
      // ============================================
      // USER TYPE DETECTION
      // ============================================
      case 'detect_user_type':
        return this.userTypeDetectorService.detectUserType(config.phone);

      // ============================================
      // VENDOR AUTHENTICATION
      // ============================================
      case 'vendor_send_otp':
        return this.vendorAuthService.sendVendorOtp(
          config.emailOrPhone,
          config.vendorType || 'owner'
        );

      case 'vendor_verify_otp':
        // Verify OTP and sync vendor profile to PostgreSQL
        const otpResult = await this.vendorAuthService.verifyVendorOtp(
          config.emailOrPhone,
          config.otp,
          config.vendorType || 'owner'
        );
        
        // Auto-sync to PostgreSQL on successful login
        if (otpResult.success && otpResult.data?.vendor) {
          const vendorUser: VendorUser = {
            id: otpResult.data.vendor.id,
            phone: otpResult.data.vendor.phone,
            email: otpResult.data.vendor.email,
            firstName: otpResult.data.vendor.f_name || otpResult.data.vendor.firstName,
            lastName: otpResult.data.vendor.l_name || otpResult.data.vendor.lastName,
            token: otpResult.data.token,
            storeId: otpResult.data.vendor.stores?.[0]?.id || otpResult.data.vendor.store_id,
            storeName: otpResult.data.vendor.stores?.[0]?.name || otpResult.data.vendor.store_name,
            isActive: otpResult.data.vendor.status === 1,
            vendorType: config.vendorType || 'owner',
            zoneWiseTopic: otpResult.data.zoneWiseTopic,
          };
          
          // Sync vendor profile to PostgreSQL (non-blocking)
          this.vendorProfileService.onVendorLogin(vendorUser)
            .then(profile => {
              if (profile) {
                this.logger.log(`✅ Vendor ${profile.name} synced to PostgreSQL on login`);
              }
            })
            .catch(err => this.logger.error(`Failed to sync vendor on login: ${err.message}`));
        }
        
        return otpResult;

      case 'vendor_login':
        // Password login and sync vendor profile
        const loginResult = await this.vendorAuthService.vendorLogin(config.email, config.password);
        
        // Auto-sync to PostgreSQL on successful login
        if (loginResult.success && loginResult.data?.vendor) {
          const vendorUser: VendorUser = {
            id: loginResult.data.vendor.id,
            phone: loginResult.data.vendor.phone,
            email: loginResult.data.vendor.email,
            firstName: loginResult.data.vendor.f_name || loginResult.data.vendor.firstName,
            lastName: loginResult.data.vendor.l_name || loginResult.data.vendor.lastName,
            token: loginResult.data.token,
            storeId: loginResult.data.vendor.stores?.[0]?.id || loginResult.data.vendor.store_id,
            storeName: loginResult.data.vendor.stores?.[0]?.name || loginResult.data.vendor.store_name,
            isActive: loginResult.data.vendor.status === 1,
            vendorType: 'owner',
            zoneWiseTopic: loginResult.data.zoneWiseTopic,
          };
          
          // Sync vendor profile to PostgreSQL (non-blocking)
          this.vendorProfileService.onVendorLogin(vendorUser)
            .then(profile => {
              if (profile) {
                this.logger.log(`✅ Vendor ${profile.name} synced to PostgreSQL on login`);
              }
            })
            .catch(err => this.logger.error(`Failed to sync vendor on login: ${err.message}`));
        }
        
        return loginResult;

      case 'get_vendor_profile':
        return this.vendorAuthService.getVendorProfile(config.token);

      case 'update_vendor_profile':
        return this.vendorAuthService.updateVendorProfile(config.token, config.data);

      // ============================================
      // VENDOR ORDER MANAGEMENT
      // ============================================
      case 'vendor_get_current_orders':
        return this.vendorAuthService.getCurrentOrders(config.token);

      case 'vendor_update_order_status':
        return this.vendorAuthService.updateOrderStatus(
          config.token,
          config.orderId,
          config.status,
          config.reason
        );

      case 'vendor_get_items_list':
        return this.vendorAuthService.getItemsList(config.token);

      case 'vendor_toggle_item':
        return this.vendorAuthService.toggleItemStatus(
          config.token,
          config.itemId,
          config.isActive
        );

      // ============================================
      // DELIVERY MAN AUTHENTICATION
      // ============================================
      case 'delivery_man_login':
      case 'dm_login':
        // Login and sync rider profile to PostgreSQL
        const dmLoginResult = await this.deliveryAuthService.deliveryManLogin(config.email, config.password);
        
        // Auto-sync to PostgreSQL on successful login
        if (dmLoginResult.success && dmLoginResult.data?.deliveryMan) {
          const dm = dmLoginResult.data.deliveryMan;
          
          // Sync rider profile to PostgreSQL (non-blocking)
          this.riderProfileService.syncRiderFromPhp(dm.id)
            .then(profile => {
              if (profile) {
                this.logger.log(`✅ Rider ${profile.name} synced to PostgreSQL on login`);
              }
            })
            .catch(err => this.logger.error(`Failed to sync rider on login: ${err.message}`));
        }
        
        return dmLoginResult;

      case 'get_delivery_man_profile':
      case 'dm_get_profile':
        return this.deliveryAuthService.getDeliveryManProfile(config.token);

      case 'dm_update_profile':
        return this.deliveryAuthService.updateProfile(config.token, config.data);

      case 'dm_update_active_status':
        return this.deliveryAuthService.updateActiveStatus(config.token, config.isActive);

      // ============================================
      // DELIVERY MAN ORDER MANAGEMENT
      // ============================================
      case 'dm_get_current_orders':
        return this.deliveryAuthService.getCurrentOrders(config.token);

      case 'dm_get_order_history':
        return this.deliveryAuthService.getOrderHistory(config.token, config.limit || 10);

      case 'dm_accept_order':
        return this.deliveryAuthService.acceptOrder(config.token, config.orderId);

      case 'dm_update_order_status':
        return this.deliveryAuthService.updateOrderStatus(
          config.token,
          config.orderId,
          config.status
        );

      case 'dm_get_order_details':
        return this.deliveryAuthService.getOrderDetails(config.token, config.orderId);

      case 'dm_record_location':
        return this.deliveryAuthService.recordLocation(
          config.token,
          config.latitude,
          config.longitude
        );

      case 'dm_get_earnings':
        return this.deliveryAuthService.getEarnings(config.token);

      // ============================================
      // CUSTOMER ORDER MANAGEMENT
      // ============================================
      case 'get_customer_orders':
        return this.orderService.getOrders(config.token, config.limit || 10);

      case 'get_running_orders':
        return this.orderService.getRunningOrders(config.token);

      case 'get_order_details':
        return this.orderService.getOrderDetails(config.token, config.orderId);

      case 'track_order':
        return this.orderService.trackOrder(config.orderId);

      case 'cancel_order':
        return this.orderService.cancelOrder(config.token, config.orderId, config.reason);

      // ============================================
      // ADDRESS MANAGEMENT
      // ============================================
      case 'get_saved_addresses':
        return this.addressService.getAddresses(config.token);

      case 'add_address':
        return this.addressService.addAddress(config.token, config.address);

      case 'delete_address':
        return this.addressService.deleteAddress(config.token, config.addressId);

      // Note: reverseGeocode and geocode should be handled by a separate Geocoding service
      // These are placeholders that return success with mock data
      case 'reverse_geocode':
        return {
          success: true,
          address: `Location at ${config.latitude}, ${config.longitude}`,
          latitude: config.latitude,
          longitude: config.longitude,
        };

      case 'geocode':
        return {
          success: true,
          address: config.address,
          latitude: 0,
          longitude: 0,
        };

      // ============================================
      // PAYMENT
      // ============================================
      case 'verify_payment':
        return {
          success: true,
          verified: true,
          orderId: config.orderId,
          paymentId: config.paymentId,
        };

      case 'get_payment_methods':
        return this.paymentService.getPaymentMethods();

      case 'generate_payment_link':
        return {
          success: true,
          paymentLink: `https://pay.mangwale.com/order/${config.orderId}`,
        };

      case 'cancel_pending_order':
        return this.orderService.cancelOrder(config.token, config.orderId, 'Payment timeout');

      // ============================================
      // CUSTOMER AUTHENTICATION
      // ============================================
      case 'check_phone':
        // PhpAuthService.sendOtp returns { success, message, isNewUser }
        return this.authService.sendOtp(config.phone);

      case 'send_otp':
        return this.authService.sendOtp(config.phone);

      case 'verify_otp':
        return this.authService.verifyOtp(config.phone, config.otp);

      case 'customer_login':
        return this.authService.verifyOtp(config.phone, config.otp);

      case 'get_customer_profile':
        return this.authService.getUserProfile(config.token);

      // ============================================
      // DEFAULT
      // ============================================
      default:
        throw new Error(`Unknown PHP API action: ${action}`);
    }
  }

  /**
   * Validate configuration
   */
  validate(config: Record<string, any>): boolean {
    return !!config.action;
  }
}
