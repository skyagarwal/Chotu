/**
 * Parcel Module Types
 * Following the AI + Guidelines architecture
 */

export interface ParcelDeliveryGuidelines {
  name: string;
  required_fields: GuidelineField[];
  optional_fields?: GuidelineField[];
  business_rules: string[];
  fallback_flow: FallbackStep[];
}

export interface GuidelineField {
  field: string;
  type: 'string' | 'number' | 'location' | 'choice' | 'boolean';
  validation?: string;
  unit?: string;
  options?: string[];
  ask_when?: string;
  examples: string[];
  fallback_prompts: string[];
}

export interface FallbackStep {
  step: number;
  action: 'collect' | 'tool_call' | 'confirm' | 'complete';
  field?: string;
  tool?: string;
  params?: string[];
  message?: string;
  buttons?: string[];
  show?: string[];
}

export interface ParcelDeliveryData {
  // Required
  pickup_address?: string;
  pickup_pincode?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  
  delivery_address?: string;
  delivery_pincode?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  
  weight?: number; // in kg
  
  // Optional
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  contents?: string;
  delivery_speed?: 'standard' | 'express';
  insurance?: boolean;
  insurance_value?: number;
  
  // Calculated
  distance_km?: number;
  estimated_price?: number;
  estimated_delivery_days?: number;
  
  // Booking
  booking_id?: string;
  tracking_id?: string;
  status?: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
}

export interface AgentResponse {
  type: 'text' | 'tool_call';
  content?: string;
  tool?: string;
  arguments?: any;
  agent_id: string;
  model_used: string;
  confidence?: number;
  raw_response?: string;
}

export interface ConversationMode {
  mode: 'ai' | 'fallback';
  fallback_step?: number;
  fallback_reason?: string;
  confidence_history?: number[];
}

