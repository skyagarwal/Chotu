import { Injectable, Logger } from '@nestjs/common';
import { ParcelDeliveryData, FallbackStep } from '../types/parcel.types';
import { parcelDeliveryGuidelines } from '../parcel-delivery.guidelines';

/**
 * Parcel Fallback Service
 * 
 * Handles the structured, deterministic fallback flow
 * when AI confidence is low or user needs step-by-step guidance
 */
@Injectable()
export class ParcelFallbackService {
  private readonly logger = new Logger(ParcelFallbackService.name);

  /**
   * Get current fallback step
   * 
   * @param stepNumber - Current step number
   * @returns Step configuration
   */
  getCurrentStep(stepNumber: number): FallbackStep | null {
    const steps = parcelDeliveryGuidelines.fallback_flow;
    return steps.find(s => s.step === stepNumber) || null;
  }

  /**
   * Get next step in fallback flow
   * 
   * @param currentStep - Current step number
   * @returns Next step configuration
   */
  getNextStep(currentStep: number): FallbackStep | null {
    const steps = parcelDeliveryGuidelines.fallback_flow;
    const next = steps.find(s => s.step === currentStep + 1);
    return next || null;
  }

  /**
   * Process user input in fallback mode
   * 
   * @param input - User's message
   * @param currentStep - Current step number
   * @param parcelData - Current parcel data
   * @returns Processing result
   */
  async processInput(
    input: string,
    currentStep: number,
    parcelData: ParcelDeliveryData
  ): Promise<{
    message: string;
    nextStep: number;
    updatedData: ParcelDeliveryData;
    buttons?: string[];
    complete?: boolean;
  }> {
    const step = this.getCurrentStep(currentStep);
    
    if (!step) {
      this.logger.error(`[Fallback] Invalid step: ${currentStep}`);
      return {
        message: 'Something went wrong. Let\'s start over.',
        nextStep: 1,
        updatedData: {}
      };
    }

    const updatedData = { ...parcelData };

    // Handle based on step action
    switch (step.action) {
      case 'collect':
        // Collect field from user input
        if (step.field) {
          updatedData[step.field] = this.parseInput(input, step.field);
          this.logger.log(`[Fallback] Collected ${step.field}: ${updatedData[step.field]}`);
        }
        
        // Get next step
        const nextStep = this.getNextStep(currentStep);
        
        if (!nextStep) {
          return {
            message: 'Booking complete!',
            nextStep: currentStep,
            updatedData,
            complete: true
          };
        }

        return {
          message: this.formatMessage(nextStep.message || '', updatedData),
          nextStep: nextStep.step,
          updatedData,
          buttons: nextStep.buttons
        };

      case 'confirm':
        // Handle confirmation
        const userConfirmed = input.toLowerCase().includes('yes') || 
                             input.toLowerCase().includes('confirm');
        
        if (userConfirmed) {
          const next = this.getNextStep(currentStep);
          return {
            message: next?.message || 'Processing...',
            nextStep: next?.step || currentStep + 1,
            updatedData
          };
        } else {
          return {
            message: 'Booking cancelled. Type "start" to begin again.',
            nextStep: 0,
            updatedData: {}
          };
        }

      case 'tool_call':
        // Tool calls will be handled by the main service
        const toolNext = this.getNextStep(currentStep);
        return {
          message: toolNext?.message || 'Processing...',
          nextStep: toolNext?.step || currentStep + 1,
          updatedData
        };

      case 'complete':
        return {
          message: this.formatMessage(step.message || 'Complete!', updatedData),
          nextStep: currentStep,
          updatedData,
          complete: true
        };

      default:
        return {
          message: 'Processing...',
          nextStep: currentStep + 1,
          updatedData
        };
    }
  }

  /**
   * Parse user input based on field type
   * 
   * @param input - User's message
   * @param field - Field name
   * @returns Parsed value
   */
  private parseInput(input: string, field: string): any {
    switch (field) {
      case 'weight':
        // Extract number from input
        const weightMatch = input.match(/(\d+\.?\d*)/);
        if (weightMatch) {
          let weight = parseFloat(weightMatch[1]);
          
          // Convert grams to kg
          if (input.toLowerCase().includes('gram') || input.toLowerCase().includes('gm')) {
            weight = weight / 1000;
          }
          
          return weight;
        }
        
        // Handle button responses
        if (input.includes('< 1 kg')) return 0.5;
        if (input.includes('1-5 kg')) return 3;
        if (input.includes('5-10 kg')) return 7;
        if (input.includes('> 10 kg')) return 15;
        
        return null;

      case 'pickup_address':
      case 'delivery_address':
        // Just store the text for now
        // In real system, would geocode this
        return input.trim();

      case 'delivery_speed':
        if (input.toLowerCase().includes('express')) {
          return 'express';
        }
        return 'standard';

      default:
        return input.trim();
    }
  }

  /**
   * Format message with variables
   * 
   * @param template - Message template
   * @param data - Data to inject
   * @returns Formatted message
   */
  private formatMessage(template: string, data: ParcelDeliveryData): string {
    let message = template;
    
    // Replace variables
    message = message.replace('{pickup_address}', data.pickup_address || '');
    message = message.replace('{delivery_address}', data.delivery_address || '');
    message = message.replace('{weight}', data.weight?.toString() || '');
    message = message.replace('{estimated_price}', data.estimated_price?.toString() || '');
    message = message.replace('{estimated_delivery_days}', data.estimated_delivery_days?.toString() || '');
    message = message.replace('{tracking_id}', data.tracking_id || '');
    message = message.replace('{delivery_speed}', data.delivery_speed === 'express' ? 'Express' : 'Standard');
    message = message.replace('{delivery_speed_emoji}', data.delivery_speed === 'express' ? '⚡' : '⏰');
    
    return message;
  }

  /**
   * Check if required fields are collected
   * 
   * @param data - Parcel data
   * @returns True if all required fields present
   */
  isDataComplete(data: ParcelDeliveryData): boolean {
    return !!(
      data.pickup_address &&
      data.delivery_address &&
      data.weight &&
      data.weight > 0
    );
  }

  /**
   * Get missing required fields
   * 
   * @param data - Parcel data
   * @returns Array of missing field names
   */
  getMissingFields(data: ParcelDeliveryData): string[] {
    const missing: string[] = [];
    
    if (!data.pickup_address) missing.push('pickup_address');
    if (!data.delivery_address) missing.push('delivery_address');
    if (!data.weight || data.weight <= 0) missing.push('weight');
    
    return missing;
  }
}

