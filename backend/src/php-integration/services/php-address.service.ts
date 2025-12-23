import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhpApiService } from './php-api.service';
import { Address } from '../../common/interfaces/common.interface';

/**
 * PHP Address Service
 * Handles all address-related API calls
 */
@Injectable()
export class PhpAddressService extends PhpApiService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Get user's saved addresses
   */
  async getAddresses(token: string): Promise<Address[]> {
    try {
      this.logger.log('📍 Fetching saved addresses');
      
      const response: any = await this.authenticatedRequest('get', '/api/v1/customer/address/list', token);
      
      // PHP API returns: {addresses: [...], total_size: 4, limit: 10, offset: 1}
      const addressArray = response?.addresses || response;
      
      if (!addressArray || !Array.isArray(addressArray)) {
        this.logger.warn(`Invalid response format: ${JSON.stringify(response).substring(0, 200)}`);
        return [];
      }

      // Transform PHP response to our Address interface
      const addresses: Address[] = addressArray.map((addr: any) => ({
        id: addr.id,
        userId: addr.user_id,
        addressType: addr.address_type,
        contactPersonName: addr.contact_person_name,
        contactPersonNumber: addr.contact_person_number,
        address: addr.address,
        latitude: addr.latitude,
        longitude: addr.longitude,
        landmark: addr.landmark,
        road: addr.road,
        house: addr.house,
        floor: addr.floor,
        zoneId: addr.zone_id,
        createdAt: addr.created_at ? new Date(addr.created_at) : undefined,
        updatedAt: addr.updated_at ? new Date(addr.updated_at) : undefined,
      }));

      this.logger.log(`✅ Fetched ${addresses.length} saved addresses`);
      return addresses;
    } catch (error) {
      this.logger.error(`Failed to fetch addresses: ${error.message}`);
      return [];
    }
  }

  /**
   * Add new address
   */
  async addAddress(token: string, address: {
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
  }): Promise<{ success: boolean; addressId?: number; message?: string }> {
    try {
      this.logger.log(`📍 Adding new address: ${address.addressType}`);
      
      const response: any = await this.authenticatedRequest(
        'post',
        '/api/v1/customer/address/add',
        token,
        {
          contact_person_name: address.contactPersonName,
          contact_person_number: address.contactPersonNumber,
          address_type: address.addressType,
          address: address.address,
          latitude: address.latitude,
          longitude: address.longitude,
          landmark: address.landmark || '',
          road: address.road || '',
          house: address.house || '',
          floor: address.floor || '',
        },
      );

      this.logger.log('✅ Address added successfully');
      return {
        success: true,
        addressId: response.id,
      };
    } catch (error) {
      this.logger.error(`Failed to add address: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update existing address
   */
  async updateAddress(
    token: string,
    addressId: number,
    address: Partial<{
      contactPersonName: string;
      contactPersonNumber: string;
      addressType: 'home' | 'office' | 'other';
      address: string;
      latitude: string;
      longitude: string;
      landmark: string;
      road: string;
      house: string;
      floor: string;
    }>,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.log(`📍 Updating address ID: ${addressId}`);
      
      const payload: any = {};
      if (address.contactPersonName) payload.contact_person_name = address.contactPersonName;
      if (address.contactPersonNumber) payload.contact_person_number = address.contactPersonNumber;
      if (address.addressType) payload.address_type = address.addressType;
      if (address.address) payload.address = address.address;
      if (address.latitude) payload.latitude = address.latitude;
      if (address.longitude) payload.longitude = address.longitude;
      if (address.landmark !== undefined) payload.landmark = address.landmark;
      if (address.road !== undefined) payload.road = address.road;
      if (address.house !== undefined) payload.house = address.house;
      if (address.floor !== undefined) payload.floor = address.floor;

      await this.authenticatedRequest('put', `/api/v1/customer/address/update/${addressId}`, token, payload);

      this.logger.log('✅ Address updated successfully');
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update address: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(token: string, addressId: number): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.log(`🗑️ Deleting address ID: ${addressId}`);
      
      await this.authenticatedRequest('delete', '/api/v1/customer/address/delete', token, { id: addressId });

      this.logger.log('✅ Address deleted successfully');
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete address: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Format address for display
   */
  formatAddress(address: Address): string {
    const parts: string[] = [];
    
    if (address.house) parts.push(address.house);
    if (address.floor) parts.push(`Floor ${address.floor}`);
    if (address.road) parts.push(address.road);
    if (address.address) parts.push(address.address);
    if (address.landmark) parts.push(`Near: ${address.landmark}`);
    
    return parts.join(', ');
  }

  /**
   * Get address type emoji
   */
  getAddressTypeEmoji(type?: string): string {
    switch (type) {
      case 'home':
        return '🏠';
      case 'office':
        return '🏢';
      case 'other':
        return '📍';
      default:
        return '📍';
    }
  }
}
