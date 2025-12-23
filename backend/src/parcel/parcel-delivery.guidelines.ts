import { ParcelDeliveryGuidelines } from './types/parcel.types';

/**
 * Parcel Delivery Guidelines
 * 
 * This is the structured definition that serves as:
 * 1. Guidelines for the AI agent (what to collect, how to behave)
 * 2. Fallback flow (when AI confidence is low)
 * 3. Training data seed (for improving AI over time)
 */
export const parcelDeliveryGuidelines: ParcelDeliveryGuidelines = {
  name: 'Parcel Delivery',
  
  required_fields: [
    {
      field: 'pickup_address',
      type: 'location',
      validation: 'valid_address_or_location',
      examples: [
        'Where should we pick up from?',
        'What\'s the pickup location?',
        'Pick up address?'
      ],
      fallback_prompts: [
        'Where should we pick up your parcel from?\n\nYou can:\n📍 Share location\n⌨️ Type address\n📋 Use saved address',
        'Please provide the pickup address'
      ]
    },
    {
      field: 'delivery_address',
      type: 'location',
      validation: 'valid_address_or_location',
      examples: [
        'Where should we deliver to?',
        'What\'s the delivery location?',
        'Delivery address?'
      ],
      fallback_prompts: [
        'Where should we deliver your parcel to?\n\nYou can:\n📍 Share location\n⌨️ Type address',
        'Please provide the delivery address'
      ]
    },
    {
      field: 'parcel_category',
      type: 'choice',
      validation: 'valid_category_id',
      examples: [
        'What type of parcel is it?',
        'Select category'
      ],
      fallback_prompts: [
        'What type of parcel are you sending?',
        'Please select a category'
      ]
    },
    {
      field: 'weight',
      type: 'number',
      unit: 'kg',
      validation: 'number > 0 and < 100',
      examples: [
        'What\'s the weight?',
        'How heavy is it?',
        'Weight of the parcel?'
      ],
      fallback_prompts: [
        'What is the approximate weight of your parcel?\n\n< 1 kg | 1-5 kg | 5-10 kg | > 10 kg',
        'Please provide weight in kilograms (e.g., "2 kg" or "500 grams")'
      ]
    }
  ],
  
  optional_fields: [
    {
      field: 'dimensions',
      type: 'string',
      ask_when: 'weight > 5 OR user_mentions("large", "big", "bulky")',
      examples: [
        'What are the dimensions?',
        'How big is it?',
        'Size of the parcel?'
      ],
      fallback_prompts: [
        'What are the dimensions? (length x width x height in cm)',
        'Please provide dimensions if larger than a shoebox'
      ]
    },
    {
      field: 'contents',
      type: 'string',
      ask_when: 'user_mentions("expensive", "valuable", "fragile")',
      examples: [
        'What are you sending?',
        'What\'s inside?',
        'Contents of the parcel?'
      ],
      fallback_prompts: [
        'What are you sending? (for insurance and handling)',
        'Please describe the contents'
      ]
    },
    {
      field: 'delivery_speed',
      type: 'choice',
      options: ['standard', 'express'],
      examples: [
        'Standard or Express delivery?',
        'How fast do you need it delivered?'
      ],
      fallback_prompts: [
        'Choose delivery speed:\n⏰ Standard (3-5 days) - ₹X\n⚡ Express (1-2 days) - ₹Y'
      ]
    },
    {
      field: 'insurance',
      type: 'boolean',
      ask_when: 'contents_value > 10000 OR user_mentions("expensive", "valuable")',
      examples: [
        'Would you like insurance?',
        'Add insurance protection?'
      ],
      fallback_prompts: [
        'Would you like insurance? (₹25 covers up to ₹5000)\nYes / No'
      ]
    }
  ],
  
  business_rules: [
    'Always confirm both addresses before booking',
    'Show pricing before payment confirmation',
    'Verify serviceability for both pickup and delivery pincodes',
    'For parcels > 20kg, mention heavy parcel surcharge',
    'For COD > ₹5000, require approval',
    'International parcels need customs declaration',
    'Fragile items need special packaging',
    'Perishable items only with express delivery'
  ],
  
  fallback_flow: [
    {
      step: 1,
      action: 'collect',
      field: 'pickup_address',
      message: '📦 *Parcel Delivery*\n\nWhere should we pick up your parcel from?\n\nYou can:\n📍 Share location\n⌨️ Type address\n📋 Use saved address',
      buttons: ['📍 Share Location', '📋 Saved Addresses']
    },
    {
      step: 2,
      action: 'collect',
      field: 'delivery_address',
      message: 'Great! Now, where should we deliver your parcel to?\n\nYou can:\n📍 Share location\n⌨️ Type address',
      buttons: ['📍 Share Location']
    },
    {
      step: 3,
      action: 'collect',
      field: 'weight',
      message: 'What is the approximate weight of your parcel?',
      buttons: ['< 1 kg', '1-5 kg', '5-10 kg', '> 10 kg']
    },
    {
      step: 4,
      action: 'tool_call',
      tool: 'calculate_pricing',
      params: ['pickup_pincode', 'delivery_pincode', 'weight', 'delivery_speed'],
      message: '🔄 Calculating pricing...'
    },
    {
      step: 5,
      action: 'confirm',
      message: '✅ *Booking Summary*\n\n📍 From: {pickup_address}\n📍 To: {delivery_address}\n⚖️ Weight: {weight} kg\n{delivery_speed_emoji} Speed: {delivery_speed}\n💰 Price: ₹{estimated_price}\n🕒 Delivery: {estimated_delivery_days} days\n\nConfirm booking?',
      buttons: ['✅ Confirm', '❌ Cancel', '✏️ Edit']
    },
    {
      step: 6,
      action: 'tool_call',
      tool: 'create_booking',
      params: ['all_collected_data'],
      message: '🔄 Creating your booking...'
    },
    {
      step: 7,
      action: 'complete',
      message: '🎉 *Booking Confirmed!*\n\nTracking ID: {tracking_id}\n\nWe\'ll pick up your parcel from {pickup_address} and deliver to {delivery_address}.\n\nYou can track your parcel anytime by sending the tracking ID.\n\nThank you! 🙏'
    }
  ]
};

