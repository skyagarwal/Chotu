import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhpApiService } from './php-api.service';
import { Order, Address } from '../../common/interfaces/common.interface';

/**
 * PHP Order Service
 * Handles all order-related API calls
 */
@Injectable()
export class PhpOrderService extends PhpApiService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Create new parcel delivery order
   */
  async createOrder(token: string, orderData: any): Promise<any> {
    // MOCK FOR TESTING
    if (process.env.TEST_MODE === 'true') {
      this.logger.log('🧪 TEST MODE: Mocking createOrder');
      return {
        success: true,
        orderId: 12345,
        message: 'Order placed successfully (Mock)',
        rawResponse: { id: 12345, message: 'Order placed successfully' },
      };
    }

    try {
      this.logger.log('📦 Creating parcel delivery order');

      // Build receiver details (JSON string)
      const receiverDetails = {
        contact_person_name: orderData.receiverName,
        contact_person_number: orderData.receiverPhone,
        address: orderData.deliveryAddress.address,
        latitude: orderData.deliveryAddress.latitude.toString(),  // Must be string
        longitude: orderData.deliveryAddress.longitude.toString(),  // Must be string
        landmark: orderData.deliveryAddress.landmark || '',
        floor: orderData.deliveryAddress.floor || '',
        road: orderData.deliveryAddress.road || '',
        house: orderData.deliveryAddress.house || '',
        zone_id: orderData.deliveryZoneId || 4,  // Zone ID as number
        address_type: 'Delivery',
      };

      // Prepare order payload matching PHP backend validation
      const payload = {
        // Required fields
        order_type: 'parcel',  // CRITICAL: Must specify order type
        payment_method: orderData.paymentMethod === 'cash' ? 'cash_on_delivery' : (orderData.paymentMethod || 'cash_on_delivery'),
        
        // Sender location (pickup) - FLAT FIELDS
        address: orderData.pickupAddress.address,
        latitude: orderData.pickupAddress.latitude.toString(),  // Must be string
        longitude: orderData.pickupAddress.longitude.toString(),  // Must be string
        floor: orderData.pickupAddress.floor || '',
        road: orderData.pickupAddress.road || '',
        house: orderData.pickupAddress.house || '',
        address_type: 'Pickup',
        
        // Receiver location - JSON STRING
        receiver_details: JSON.stringify(receiverDetails),
        
        // Parcel specific
        parcel_category_id: orderData.parcelCategoryId || 5,  // From user selection
        charge_payer: 'sender',  // Who pays: sender or receiver
        distance: orderData.distance !== undefined && orderData.distance !== null ? orderData.distance : 5,
        
        // Optional
        order_note: orderData.orderNote || '',
        delivery_instruction: orderData.deliveryInstruction || '',
        order_amount: orderData.orderAmount || 0,
        dm_tips: orderData.dmTips || 0,
      };

      this.logger.debug('Order payload:', payload);

      // Prepare headers
      const headers = {
        moduleId: '3',  // Module ID 3 = "Local Delivery" for parcel
        zoneId: JSON.stringify([orderData.senderZoneId || 4]),  // Zone IDs as JSON array
      };

      this.logger.debug('Request headers:', headers);

      // Send order creation request with headers
      const response = await this.authenticatedRequest(
        'post',
        '/api/v1/customer/order/place',
        token,
        payload,
        headers,  // Pass headers
      );

      this.logger.log('✅ Order created successfully');
      this.logger.debug('PHP Response:', response);
      
      // Transform PHP response to expected format
      // PHP returns: { message: "Order placed successfully", order_id: 123, ... }
      return {
        success: true,
        orderId: response.order_id || response.id,
        message: response.message || 'Order placed successfully',
        rawResponse: response,
      };
    } catch (error) {
      this.logger.error('Failed to create order:', error.message);
      throw error;
    }
  }

  /**
   * Create food order (Cart -> Address -> Place)
   * Also used for e-commerce orders with moduleId parameter
   */
  async createFoodOrder(token: string, orderData: any): Promise<any> {
    try {
      const moduleId = orderData.moduleId || 2; // 2 = Food, 1 = E-commerce/Grocery
      this.logger.log(`🍔 Creating ${moduleId === 1 ? 'e-commerce' : 'food'} order`);

      // 1. Add/Get Address ID
      let addressId = orderData.addressId;
      if (!addressId && orderData.deliveryAddress) {
        this.logger.debug('Adding new address for order');
        const addressResponse = await this.authenticatedRequest(
          'post',
          '/api/v1/customer/address/add',
          token,
          {
            address: orderData.deliveryAddress.address,
            address_type: 'Other',
            contact_person_name: orderData.deliveryAddress.contact_person_name || 'User',
            contact_person_number: orderData.deliveryAddress.contact_person_number || '0000000000',
            latitude: orderData.deliveryAddress.latitude,
            longitude: orderData.deliveryAddress.longitude,
          }
        );
        
        // Check response for ID
        addressId = addressResponse.id || addressResponse.address_id;
        this.logger.debug(`Add address response: ${JSON.stringify(addressResponse)}`);
        
        // PHP API doesn't return ID in add response, so fetch latest address
        if (!addressId) {
          this.logger.debug('Address ID not in response, fetching address list');
          const addressList = await this.authenticatedRequest(
            'get',
            '/api/v1/customer/address/list',
            token
          );
          
          // Get the most recently added address (should be first or last depending on sort)
          const addresses = addressList?.addresses || addressList || [];
          if (Array.isArray(addresses) && addresses.length > 0) {
            // Find address matching our coordinates or get the most recent
            const matchingAddress = addresses.find((a: any) => 
              Math.abs(parseFloat(a.latitude) - parseFloat(orderData.deliveryAddress.latitude!)) < 0.001 &&
              Math.abs(parseFloat(a.longitude) - parseFloat(orderData.deliveryAddress.longitude!)) < 0.001
            );
            addressId = matchingAddress?.id || addresses[0]?.id;
            this.logger.debug(`Found address ID: ${addressId}`);
          }
        }
      }

      if (!addressId) {
        throw new Error('Failed to obtain delivery address ID');
      }

      // 2. Clear Cart
      this.logger.debug('Clearing existing cart');
      await this.authenticatedRequest('delete', '/api/v1/customer/cart/remove', token);

      // 3. Add Items to Cart
      this.logger.debug(`Adding ${orderData.items.length} items to cart`);
      let storeId = null;

      for (const item of orderData.items) {
        // Support multiple field naming conventions
        if (!storeId) storeId = item.store_id || item.storeId;
        
        const itemId = item.item_id || item.itemId || item.id;
        if (!itemId) {
          this.logger.error(`Item missing ID: ${JSON.stringify(item)}`);
          continue;
        }
        
        this.logger.debug(`Adding item to cart: item_id=${itemId}, quantity=${item.quantity || 1}`);
        
        await this.authenticatedRequest(
          'post',
          '/api/v1/customer/cart/add',
          token,
          {
            item_id: itemId,
            quantity: item.quantity || 1,
            variant: item.variant || [],
            addon_ids: item.addon_ids || [],
            addon_quantities: item.addon_quantities || [],
          },
          { moduleId: String(moduleId) } // Pass moduleId in headers
        );
      }

      if (!storeId) {
        throw new Error('No store ID found in items');
      }

      // 4. Place Order
      this.logger.debug('Placing final order');
      const payload = {
        store_id: storeId,
        delivery_address_id: addressId,
        payment_method: orderData.paymentMethod || 'cash_on_delivery',
        delivery_instruction: orderData.orderNote || '',
        order_type: 'delivery'
      };

      const response = await this.authenticatedRequest(
        'post',
        '/api/v1/customer/order/place',
        token,
        payload,
        { moduleId: String(moduleId) } // Pass moduleId in headers
      );

      this.logger.log(`✅ ${moduleId === 1 ? 'E-commerce' : 'Food'} order created successfully`);
      
      return {
        success: true,
        orderId: response.order_id || response.id,
        message: response.message || 'Order placed successfully',
        rawResponse: response,
      };

    } catch (error) {
      this.logger.error('Failed to create food order:', error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get user's order history
   */
  async getOrders(token: string, limit: number = 10): Promise<Order[]> {
    try {
      this.logger.log('📋 Fetching order history');

      const response: any = await this.authenticatedRequest(
        'get',
        '/api/v1/customer/order/list',
        token,
        { limit },
      );

      if (!response || !Array.isArray(response)) {
        return [];
      }

      const orders: Order[] = response.map((order: any) => ({
        id: order.id,
        userId: order.user_id,
        orderAmount: parseFloat(order.order_amount),
        deliveryCharge: parseFloat(order.delivery_charge || 0),
        orderStatus: order.order_status,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderNote: order.order_note,
        distance: order.distance,
        vehicleId: order.vehicle_id,
        createdAt: order.created_at ? new Date(order.created_at) : undefined,
        // Parse addresses from JSON strings
        pickupAddress: order.sender_details ? JSON.parse(order.sender_details) : {},
        deliveryAddress: order.receiver_details ? JSON.parse(order.receiver_details) : {},
      }));

      this.logger.log(`✅ Fetched ${orders.length} orders`);
      return orders;
    } catch (error) {
      this.logger.error(`Failed to fetch orders: ${error.message}`);
      return [];
    }
  }

  /**
   * Get running/active orders
   */
  async getRunningOrders(token: string): Promise<Order[]> {
    try {
      this.logger.log('🚚 Fetching running orders');

      const response: any = await this.authenticatedRequest(
        'get',
        '/api/v1/customer/order/running-orders',
        token,
      );

      if (!response || !Array.isArray(response)) {
        return [];
      }

      const orders: Order[] = response.map((order: any) => ({
        id: order.id,
        userId: order.user_id,
        orderAmount: parseFloat(order.order_amount),
        deliveryCharge: parseFloat(order.delivery_charge || 0),
        orderStatus: order.order_status,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        createdAt: order.created_at ? new Date(order.created_at) : undefined,
        pickupAddress: order.sender_details ? JSON.parse(order.sender_details) : {},
        deliveryAddress: order.receiver_details ? JSON.parse(order.receiver_details) : {},
      }));

      this.logger.log(`✅ Found ${orders.length} running orders`);
      return orders;
    } catch (error) {
      this.logger.error(`Failed to fetch running orders: ${error.message}`);
      return [];
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(token: string, orderId: number): Promise<Order | null> {
    try {
      this.logger.log(`📦 Fetching order details: ${orderId}`);

      const response: any = await this.authenticatedRequest(
        'get',
        '/api/v1/customer/order/details',
        token,
        { order_id: orderId },
      );

      if (!response) {
        return null;
      }

      const order: Order = {
        id: response.id,
        userId: response.user_id,
        orderAmount: parseFloat(response.order_amount),
        deliveryCharge: parseFloat(response.delivery_charge || 0),
        orderStatus: response.order_status,
        paymentMethod: response.payment_method,
        paymentStatus: response.payment_status,
        orderNote: response.order_note,
        distance: response.distance,
        vehicleId: response.vehicle_id,
        createdAt: response.created_at ? new Date(response.created_at) : undefined,
        pickupAddress: response.sender_details ? JSON.parse(response.sender_details) : {},
        deliveryAddress: response.receiver_details ? JSON.parse(response.receiver_details) : {},
      };

      this.logger.log('✅ Order details fetched');
      return order;
    } catch (error) {
      this.logger.error(`Failed to fetch order details: ${error.message}`);
      return null;
    }
  }

  /**
   * Track order (no authentication required)
   */
  async trackOrder(orderId: number): Promise<{
    success: boolean;
    status?: string;
    location?: { latitude: number; longitude: number };
    message?: string;
  }> {
    try {
      this.logger.log(`🔍 Tracking order: ${orderId}`);

      const response: any = await this.get('/api/v1/customer/order/track', { order_id: orderId });

      return {
        success: true,
        status: response.order_status,
        location: response.delivery_man_location
          ? {
              latitude: parseFloat(response.delivery_man_location.latitude),
              longitude: parseFloat(response.delivery_man_location.longitude),
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to track order: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    token: string,
    orderId: number,
    reason?: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.log(`❌ Canceling order: ${orderId}`);

      await this.authenticatedRequest('put', '/api/v1/customer/order/cancel', token, {
        order_id: orderId,
        reason: reason || 'Customer requested cancellation',
      });

      this.logger.log('✅ Order canceled successfully');
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to cancel order: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    token: string,
    orderId: number,
    paymentMethod: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.log(`💳 Updating payment method for order: ${orderId}`);

      await this.authenticatedRequest('put', '/api/v1/customer/order/payment-method', token, {
        order_id: orderId,
        payment_method: paymentMethod,
      });

      this.logger.log('✅ Payment method updated');
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update payment method: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get order status emoji
   */
  getOrderStatusEmoji(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'processing':
        return '📦';
      case 'picked_up':
        return '🚚';
      case 'handover':
        return '🤝';
      case 'delivered':
        return '✅';
      case 'canceled':
        return '❌';
      case 'refunded':
        return '💰';
      case 'failed':
        return '❌';
      default:
        return '📋';
    }
  }

  /**
   * Format order status for display
   */
  formatOrderStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      picked_up: 'Picked Up',
      handover: 'Handover',
      delivered: 'Delivered',
      canceled: 'Canceled',
      refunded: 'Refunded',
      failed: 'Failed',
    };
    return statusMap[status] || status;
  }
}
