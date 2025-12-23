import { Injectable, Logger } from '@nestjs/common';
import { Address } from '../../common/interfaces/common.interface';
import { PhpAddressService } from '../../php-integration/services/php-address.service';
import { formatPrice } from '../../common/utils/helpers';

/**
 * Address Management Service
 * Handles displaying, selecting, and managing addresses
 */
@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(private readonly phpAddressService: PhpAddressService) {}

  /**
   * Get formatted list of saved addresses for display
   */
  async getFormattedAddresses(token: string): Promise<{
    success: boolean;
    addresses?: Address[];
    formattedText?: string;
    message?: string;
  }> {
    try {
      const addresses = await this.phpAddressService.getAddresses(token);

      if (addresses.length === 0) {
        return {
          success: true,
          addresses: [],
          formattedText: '📍 You have no saved addresses yet.',
        };
      }

      // Format addresses for display
      let text = '📍 **Your Saved Addresses**\n\n';
      
      addresses.forEach((addr, index) => {
        const emoji = this.phpAddressService.getAddressTypeEmoji(addr.addressType);
        const typeLabel = addr.addressType ? addr.addressType.toUpperCase() : 'OTHER';
        
        text += `${index + 1}. ${emoji} **${typeLabel}**\n`;
        text += `   ${this.phpAddressService.formatAddress(addr)}\n`;
        if (addr.contactPersonName) {
          text += `   👤 ${addr.contactPersonName}`;
          if (addr.contactPersonNumber) {
            text += ` (${addr.contactPersonNumber})`;
          }
          text += '\n';
        }
        text += '\n';
      });

      text += '💡 Reply with the number to select an address\n';
      text += '🆕 Or type "new" to enter a new address';

      return {
        success: true,
        addresses,
        formattedText: text,
      };
    } catch (error) {
      this.logger.error(`Error fetching addresses: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch saved addresses',
      };
    }
  }

  /**
   * Select address from list by index
   */
  selectAddressByIndex(addresses: Address[], index: number): Address | null {
    if (index < 0 || index >= addresses.length) {
      return null;
    }
    return addresses[index];
  }

  /**
   * Save new address with label
   */
  async saveAddress(
    token: string,
    address: {
      contactPersonName: string;
      contactPersonNumber: string;
      addressType: 'home' | 'office' | 'other';
      address: string;
      latitude: string;
      longitude: string;
      landmark?: string;
      road?: string;
      house?: string;
      floor?: string;
    },
  ): Promise<{
    success: boolean;
    addressId?: number;
    message?: string;
  }> {
    return this.phpAddressService.addAddress(token, address);
  }

  /**
   * Format address for confirmation
   */
  formatAddressConfirmation(address: Address, landmark?: string): string {
    let text = '📍 **Address Confirmed**\n\n';
    text += this.phpAddressService.formatAddress(address);
    
    if (landmark) {
      text += `\n🏷️ Landmark: ${landmark}`;
    }
    
    if (address.contactPersonName) {
      text += `\n\n👤 Contact: ${address.contactPersonName}`;
      if (address.contactPersonNumber) {
        text += ` (${address.contactPersonNumber})`;
      }
    }
    
    return text;
  }

  /**
   * Parse Google Maps link or location
   */
  parseLocationFromText(text: string): {
    success: boolean;
    latitude?: string;
    longitude?: string;
    address?: string;
  } {
    // Try to parse Google Maps link
    const googleMapsRegex = /maps\.google\.com.*@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = text.match(googleMapsRegex);
    
    if (match) {
      return {
        success: true,
        latitude: match[1],
        longitude: match[2],
      };
    }

    // Try to parse coordinates
    const coordsRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const coordsMatch = text.match(coordsRegex);
    
    if (coordsMatch) {
      return {
        success: true,
        latitude: coordsMatch[1],
        longitude: coordsMatch[2],
      };
    }

    // Treat as plain address text
    return {
      success: true,
      address: text.trim(),
    };
  }

  /**
   * Validate landmark input
   */
  validateLandmark(landmark: string): boolean {
    return landmark.trim().length >= 3;
  }

  /**
   * Ask for landmark
   */
  getLandmarkPrompt(addressType: 'pickup' | 'delivery'): string {
    return `🏷️ Please provide a landmark near your **${addressType}** location to help the delivery person find you easily.\n\n` +
      `Example: "Near City Hospital", "Behind Police Station", "Opposite Mall"\n\n` +
      `💡 Or type "skip" if you don't want to add a landmark.`;
  }

  /**
   * Get address type selection prompt
   */
  getAddressTypePrompt(): string {
    return '🏠 **What type of address is this?**\n\n' +
      '1️⃣ Home 🏠\n' +
      '2️⃣ Office 🏢\n' +
      '3️⃣ Other 📍\n\n' +
      'Reply with 1, 2, or 3:';
  }

  /**
   * Parse address type selection
   */
  parseAddressType(input: string): 'home' | 'office' | 'other' | null {
    const normalized = input.trim().toLowerCase();
    
    if (normalized === '1' || normalized === 'home') {
      return 'home';
    }
    if (normalized === '2' || normalized === 'office') {
      return 'office';
    }
    if (normalized === '3' || normalized === 'other') {
      return 'other';
    }
    
    return null;
  }
}
