import { Injectable, Logger } from '@nestjs/common';
import { PhpAddressService } from '../../php-integration/services/php-address.service';
import { AddressExtractionService } from '../../agents/services/address-extraction.service';
import { SessionService } from '../../session/session.service';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';

/**
 * Address Executor
 * 
 * Collects and validates addresses (with saved address support)
 */
@Injectable()
export class AddressExecutor implements ActionExecutor {
  readonly name = 'address';
  private readonly logger = new Logger(AddressExecutor.name);

  constructor(
    private readonly phpAddressService: PhpAddressService,
    private readonly addressExtraction: AddressExtractionService,
    private readonly sessionService: SessionService,
  ) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const field = config.field as string; // e.g., 'delivery_address'
      const allowSaved = config.allow_saved !== false;
      const requireCoordinates = config.require_coordinates !== false;

      // Check if address already collected
      if (context.data[field]) {
        return {
          success: true,
          output: context.data[field],
          event: 'address_valid',
        };
      }

      const userMessage = context.data._user_message as string;
      const session = await this.sessionService.getSession(context._system.sessionId);
      const userId = session?.data?.user_id;
      const authToken = session?.data?.auth_token;

      // Prevent reusing the same message for delivery that was used for pickup
      if (field === 'delivery_address' && context.data.pickup_address) {
        const pickup = context.data.pickup_address;
        const pickupInput = pickup.raw_input || pickup.metadata?.raw_input;
        
        if (pickupInput && pickupInput === userMessage) {
          this.logger.log('Message already used for pickup, asking for delivery...');
          // Skip to Step 5 (Ask for address)
          const locationLabel = 'delivery';
          context.data._last_response = `📍 Share your ${locationLabel} location:\n\n[BTN|📍 Share Location|__LOCATION__]\n\nOr type address / paste Google Maps link`;

          return {
            success: true,
            output: null,
            event: 'waiting_for_input',
          };
        }
      }

      // Step 1: Offer saved addresses if user is authenticated
      if (allowSaved && userId && authToken) {
        const savedAddresses = await this.phpAddressService.getAddresses(authToken);

        if (savedAddresses && savedAddresses.length > 0 && !context.data[`${field}_offered`]) {
          // Check for smart match first (Step 2b logic moved here for efficiency)
          const messageLower = userMessage.toLowerCase();
          const matched = savedAddresses.find(addr => {
            const typeMatch = addr.addressType && (
              addr.addressType.toLowerCase() === messageLower ||
              messageLower.includes(addr.addressType.toLowerCase())
            );
            
            const nameMatch = addr.contactPersonName && (
              messageLower.includes(addr.contactPersonName.toLowerCase())
            );
            
            return typeMatch || nameMatch;
          });

          if (matched) {
            const addressData = {
              address: matched.address,
              latitude: parseFloat(matched.latitude),
              longitude: parseFloat(matched.longitude),
              contact_person_name: matched.contactPersonName,
              contact_person_number: matched.contactPersonNumber,
              address_id: matched.id,
              source: 'saved_address',
            };

            context.data[field] = addressData;
            context.data._last_response = `✅ Using your saved address for ${matched.contactPersonName || matched.addressType}: ${matched.address}`;

            return {
              success: true,
              output: addressData,
              event: 'address_valid',
            };
          }

          // If no smart match, offer the list as cards/buttons
          context.data[`${field}_offered`] = true;
          context.data[`${field}_options`] = savedAddresses;

          const locationLabel = field.includes('pickup') || field.includes('sender') ? 'pickup' : 'delivery';
          
          // Build address buttons for quick selection using | separator to avoid colon conflicts
          const addressButtons = savedAddresses.map((addr, idx) => {
            const emoji = this.phpAddressService.getAddressTypeEmoji(addr.addressType);
            const shortAddr = addr.address?.length > 35 ? addr.address.substring(0, 35) + '...' : addr.address;
            return `[BTN|${emoji} ${addr.addressType || 'Saved'} - ${shortAddr}|${idx + 1}]`;
          }).join('\n');

          context.data._last_response = `Choose an address or share new location:\n\n${addressButtons}\n\n[BTN|📍 Share New Location|__LOCATION__]`;

          return {
            success: true, // Successfully offered addresses
            output: null,
            event: 'waiting_for_input',
          };
        }
      }

      // Step 2: Check if user selected from saved addresses (by number OR by name)
      if (context.data[`${field}_options`]) {
        const options = context.data[`${field}_options`] as any[];
        let selected = null;

        // Try numeric selection first
        const selection = parseInt(userMessage);
        if (!isNaN(selection) && selection >= 1 && selection <= options.length) {
          selected = options[selection - 1];
        } else {
          // Try matching by address type (home, office, work, etc.) OR contact person name
          const messageLower = userMessage.toLowerCase();
          const typeMatch = options.find(addr => 
            (addr.addressType && addr.addressType.toLowerCase() === messageLower) ||
            (addr.addressType && messageLower.includes(addr.addressType.toLowerCase())) ||
            (addr.contactPersonName && addr.contactPersonName.toLowerCase().includes(messageLower))
          );
          if (typeMatch) {
            selected = typeMatch;
          }
        }

        if (selected) {
          const addressData = {
            address: selected.address,
            latitude: parseFloat(selected.latitude),
            longitude: parseFloat(selected.longitude),
            contact_person_name: selected.contactPersonName,
            contact_person_number: selected.contactPersonNumber,
            address_id: selected.id,
            source: 'saved_address',
            raw_input: userMessage,
          };

          context.data[field] = addressData;
          delete context.data[`${field}_options`];
          delete context.data[`${field}_offered`];

          context.data._last_response = `✅ Using saved address: ${selected.address}`;

          return {
            success: true,
            output: addressData,
            event: 'address_valid',
          };
        }
      }

      // Step 2b: REMOVED (Merged into Step 1)

      // Step 3: Check for location share from session
      if (session?.data?.location && session.data.lastLocationUpdate) {
        const locationAge = Date.now() - session.data.lastLocationUpdate;
        
        if (locationAge < 60000) { // Within last 60 seconds
          const { lat, lng } = session.data.location;

          const addressData = {
            address: userMessage || 'Shared location',
            latitude: lat,
            longitude: lng,
            source: 'location_share',
            raw_input: userMessage,
          };

          context.data[field] = addressData;
          context.data._last_response = `✅ Location received: ${addressData.address}`;

          return {
            success: true,
            output: addressData,
            event: 'address_valid',
          };
        }
      }

      // Step 4: Extract address from message
      const extraction = await this.addressExtraction.extractAddress(userMessage, {
        city: 'Nashik',
        userLocation: session?.data?.location,
      });

      if (extraction.success && extraction.address) {
        const addr = extraction.address;

        if (requireCoordinates && (!addr.latitude || !addr.longitude)) {
          context.data._last_response = `Got "${addr.address}" - need exact location:\n\n[BTN|📍 Share Location|__LOCATION__]\n\nOr paste Google Maps link`;

          return {
            success: true, // Successfully asked for coordinates
            output: null,
            event: 'waiting_for_input',
          };
        }

        const addressData = {
          address: addr.address,
          latitude: addr.latitude,
          longitude: addr.longitude,
          source: addr.source,
          raw_input: userMessage,
          ...addr.metadata,
        };

        context.data[field] = addressData;
        context.data._last_response = `✅ Address confirmed: ${addr.address}`;

        return {
          success: true,
          output: addressData,
          event: 'address_valid',
        };
      }

      // Step 5: Ask for address
      const locationLabel = field.includes('pickup') || field.includes('sender') 
        ? 'pickup' 
        : 'delivery';

      context.data._last_response = `📍 Share your ${locationLabel} location:\n\n[BTN|📍 Share Location|__LOCATION__]\n\nOr type address / paste Google Maps link`;

      return {
        success: true, // Successfully asked for input
        output: null,
        event: 'waiting_for_input',
      };
    } catch (error) {
      this.logger.error(`Address execution failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validate(config: Record<string, any>): boolean {
    return !!config.field;
  }
}
