import { Address, Order } from '../../common/interfaces/common.interface';

/**
 * Order flow state
 */
export interface OrderFlowState {
  step: OrderStep;
  userId: number;
  userToken: string;
  userPhone: string;
  userName?: string;
  userEmail?: string;
  
  // Address selection
  pickupAddress?: Address;
  pickupLandmark?: string;
  deliveryAddress?: Address;
  deliveryLandmark?: string;
  
  // Receiver details
  receiverName?: string;
  receiverPhone?: string;
  
  // Order details
  orderNote?: string;
  distance?: number;
  vehicleId?: number;
  
  // Payment
  paymentMethod?: string;
  
  // Created order
  order?: Order;
}

/**
 * Order flow steps
 */
export enum OrderStep {
  AUTHENTICATION = 'authentication',
  PICKUP_ADDRESS_SELECTION = 'pickup_address_selection',
  PICKUP_LANDMARK = 'pickup_landmark',
  DELIVERY_ADDRESS_SELECTION = 'delivery_address_selection',
  DELIVERY_LANDMARK = 'delivery_landmark',
  RECEIVER_DETAILS = 'receiver_details',
  ORDER_NOTE = 'order_note',
  PAYMENT_METHOD = 'payment_method',
  CONFIRM_ORDER = 'confirm_order',
  ORDER_CREATED = 'order_created',
}

/**
 * Address selection mode
 */
export enum AddressMode {
  SAVED = 'saved',
  NEW = 'new',
  LOCATION = 'location',
}
