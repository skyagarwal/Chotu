/**
 * Payment Integration Client
 * 
 * HTTP client for communicating with payment service in admin-backend.
 * Replaces direct PaymentService calls with HTTP API requests.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Payment initiation parameters
 */
export interface PaymentInitiateParams {
  phpOrderId: number | string;
  amount: number;
  currency?: string;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  description?: string;
  returnUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  provider?: 'razorpay' | 'juspay' | 'amazonpay' | 'stripe' | 'mock';
}

/**
 * Payment transaction response
 */
export interface PaymentTransaction {
  id: number;
  phpOrderId: number;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  paymentUrl?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment statistics
 */
export interface PaymentStats {
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
}

/**
 * Payment Client for Admin Backend Integration
 */
@Injectable()
export class PaymentClient {
  private readonly logger = new Logger(PaymentClient.name);
  private readonly adminBackendUrl: string;
  private readonly timeout = 10000; // 10 second timeout

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminBackendUrl = 
      this.configService.get<string>('ADMIN_BACKEND_URL') || 
      'http://localhost:3002';

    this.logger.log(`💳 Payment Client initialized: ${this.adminBackendUrl}`);
  }

  /**
   * Initiate a new payment transaction
   */
  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentTransaction> {
    try {
      this.logger.debug(`Initiating payment for order #${params.phpOrderId}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminBackendUrl}/api/payments/initiate`,
          params,
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Payment initiation failed');
      }

      this.logger.log(`✅ Payment initiated: Transaction #${response.data.data.id}`);
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`❌ Payment initiation failed: ${error.message}`);
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Payment service unavailable. Please try again later.');
      }

      // Handle timeout
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new Error('Payment service timeout. Please try again.');
      }

      // Re-throw original error
      throw error;
    }
  }

  /**
   * Get payment transaction by ID
   */
  async getTransaction(transactionId: number): Promise<PaymentTransaction | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/payments/${transactionId}`,
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }

      this.logger.error(`Failed to get transaction #${transactionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment transactions by order ID
   */
  async getTransactionsByOrderId(orderId: number): Promise<PaymentTransaction[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/payments/order/${orderId}`,
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        return [];
      }

      return response.data.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to get transactions for order #${orderId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get latest payment transaction for an order
   */
  async getLatestTransactionForOrder(orderId: number): Promise<PaymentTransaction | null> {
    const transactions = await this.getTransactionsByOrderId(orderId);
    return transactions.length > 0 ? transactions[0] : null;
  }

  /**
   * Get payment statistics
   */
  async getStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    provider?: string;
  }): Promise<PaymentStats | null> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }
      
      if (filters?.provider) {
        params.append('provider', filters.provider);
      }

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/payments/stats?${params.toString()}`,
          { timeout: this.timeout }
        )
      );

      if (!response.data.success) {
        return null;
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Failed to get payment stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Test payment provider connection
   */
  async testProvider(provider: string = 'razorpay'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/api/payments/test/${provider}`,
          { timeout: this.timeout }
        )
      );

      return {
        success: response.data.success,
        message: response.data.message || 'Provider test completed',
      };
    } catch (error: any) {
      this.logger.error(`Provider test failed: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Provider test failed',
      };
    }
  }

  /**
   * Check if payment service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminBackendUrl}/health`,
          { timeout: 3000 }
        )
      );

      return response.data.ok === true;
    } catch (error) {
      return false;
    }
  }
}
