import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../services/base-agent.service';
import { AgentContext, AgentConfig, AgentType, FunctionDefinition, ModuleType } from '../types/agent.types';

/**
 * Booking Agent
 * 
 * Handles parcel bookings, ride bookings, and other reservation flows
 */
@Injectable()
export class BookingAgent extends BaseAgent {
  getConfig(): AgentConfig {
    return {
      id: 'booking-agent',
      type: AgentType.BOOKING,
      name: 'Booking Agent',
      description: 'Handles bookings for parcels, rides, and services',
      modules: [ModuleType.PARCEL], // Parcel delivery booking
      systemPrompt: '', // Set dynamically
      temperature: 0.4,
      maxTokens: 2000,
      functions: this.getFunctions(),
      enabled: true,
    };
  }

  getSystemPrompt(context: AgentContext): string {
    const { getPersonalityPrompt } = require('../config/personality.config');
    const basePrompt = getPersonalityPrompt(context.module);

    const modulePrompts = {
      parcel: `
PARCEL BOOKING ROLE:
You are a parcel delivery booking assistant.

Booking steps:
1. Get pickup location (ask if they want to use a saved address)
2. Get delivery location
3. Get package details (size, weight, contents)
4. Calculate cost
5. Show quote
6. Confirm booking

If user uploads package image:
- Use dimension estimation to auto-fill details
- Save user time
- Increase booking conversion

Package size categories:
- Small: Up to 2kg, fits in a shoebox (₹30-50)
- Medium: 2-10kg, small box (₹50-100)
- Large: 10-25kg, medium box (₹100-200)
- Extra Large: 25kg+, large box (₹200+)

Be efficient, clear about pricing, and helpful with suggestions.`,

      ride: `
RIDE BOOKING ROLE:
You are a ride booking assistant.

Booking steps:
1. Get pickup location
2. Get destination
3. Show estimated fare and time
4. Confirm vehicle type
5. Book ride

Vehicle types:
- Auto: ₹10/km, seats 3
- Sedan: ₹15/km, seats 4, AC
- SUV: ₹20/km, seats 6-7, AC

Be quick, professional, and reassuring about driver details.`,
    };

    const specificPrompt = modulePrompts[context.module] || `You are a booking assistant for ${context.module} services.`;
    
    return `${basePrompt}\n\n${specificPrompt}`;
  }

  getFunctions(): FunctionDefinition[] {
    return [
      {
        name: 'estimate_dimensions_from_image',
        description:
          'Estimate package dimensions and weight from image (auto-fill)',
        parameters: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: 'URL of package image',
            },
          },
          required: ['image_url'],
        },
      },
      {
        name: 'calculate_parcel_cost',
        description: 'Calculate parcel delivery cost',
        parameters: {
          type: 'object',
          properties: {
            pickup: {
              type: 'string',
              description: 'Pickup location',
            },
            delivery: {
              type: 'string',
              description: 'Delivery location',
            },
            weight: {
              type: 'number',
              description: 'Package weight in kg',
            },
            dimensions: {
              type: 'object',
              description: 'Package dimensions',
              properties: {
                length: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
          },
          required: ['pickup', 'delivery', 'weight'],
        },
      },
      {
        name: 'get_user_addresses',
        description: 'Get the user\'s saved addresses from their profile. Use this when the user wants to select a pickup or delivery address.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'save_user_address',
        description: 'Save a new address for the user. Use when user wants to save an address as home, office, or other. Requires location coordinates.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude coordinate of the address',
            },
            longitude: {
              type: 'number',
              description: 'Longitude coordinate of the address',
            },
            address_type: {
              type: 'string',
              enum: ['home', 'office', 'other'],
              description: 'Type of address - home, office, or other',
            },
            address_text: {
              type: 'string',
              description: 'Human-readable address text (optional)',
            },
          },
          required: ['latitude', 'longitude', 'address_type'],
        },
      },
    ];
  }
}
