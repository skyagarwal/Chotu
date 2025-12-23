import { Controller, Get, Delete, Query, Logger, BadRequestException } from '@nestjs/common';
import { UserContextService, UserContext } from './user-context.service';

/**
 * User Context Controller
 * 
 * Provides API endpoints for:
 * - Getting comprehensive user context for AI personalization
 * - Testing utilities (get OTP, delete test user)
 */
@Controller('user-context')
export class UserContextController {
  private readonly logger = new Logger(UserContextController.name);

  constructor(private readonly userContextService: UserContextService) {}

  /**
   * Get comprehensive user context by phone
   * GET /api/user-context?phone=9923383838
   */
  @Get()
  async getUserContext(@Query('phone') phone: string): Promise<{
    success: boolean;
    data?: UserContext;
    message?: string;
  }> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    this.logger.log(`📱 Getting context for phone: ${phone}`);

    const context = await this.userContextService.getUserContext(phone);

    if (!context) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    return {
      success: true,
      data: context,
    };
  }

  /**
   * Get user context summary (lighter version for chat)
   * GET /api/user-context/summary?phone=9923383838
   */
  @Get('summary')
  async getUserSummary(@Query('phone') phone: string): Promise<{
    success: boolean;
    data?: {
      userId: number;
      name: string;
      greeting: string;
      contextSummary: string;
      suggestions: string[];
      walletBalance: number;
      loyaltyPoints: number;
      totalOrders: number;
    };
    message?: string;
  }> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    const context = await this.userContextService.getUserContext(phone);

    if (!context) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    return {
      success: true,
      data: {
        userId: context.userId,
        name: `${context.firstName} ${context.lastName}`.trim(),
        greeting: context.personalizedGreeting,
        contextSummary: context.contextSummary,
        suggestions: context.suggestedActions,
        walletBalance: context.wallet.balance,
        loyaltyPoints: context.wallet.loyaltyPoints,
        totalOrders: context.orderHistory.totalOrders,
      },
    };
  }

  /**
   * TEST ONLY: Get current OTP for a phone number
   * GET /api/user-context/test/otp?phone=9158886329
   */
  @Get('test/otp')
  async getOtp(@Query('phone') phone: string): Promise<{
    success: boolean;
    otp?: string;
    message?: string;
  }> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    this.logger.warn(`⚠️ TEST: Getting OTP for ${phone}`);

    const otp = await this.userContextService.getOtpForPhone(phone);

    if (!otp) {
      return {
        success: false,
        message: 'No OTP found for this phone',
      };
    }

    return {
      success: true,
      otp,
    };
  }

  /**
   * TEST ONLY: Delete user and all related data for testing fresh registration
   * DELETE /api/user-context/test/user?phone=9158886329
   */
  @Delete('test/user')
  async deleteTestUser(@Query('phone') phone: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // Safety check - only allow specific test numbers
    const allowedTestNumbers = ['9158886329', '8888777766', '9999888877'];
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
    
    if (!allowedTestNumbers.includes(cleanPhone)) {
      throw new BadRequestException('This phone number is not in the test whitelist');
    }

    this.logger.warn(`⚠️ TEST: Deleting user ${phone}`);

    const deleted = await this.userContextService.deleteUserForTesting(phone);

    return {
      success: deleted,
      message: deleted 
        ? `User ${phone} deleted successfully` 
        : `User ${phone} not found or could not be deleted`,
    };
  }
}
