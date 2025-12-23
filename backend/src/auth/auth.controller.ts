import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PhpAuthService } from '../php-integration/services/php-auth.service';
import { normalizePhoneNumber } from '../common/utils/helpers';

/**
 * Auth Controller - API Gateway for Authentication
 * 
 * Proxies auth requests to PHP backend with proper normalization
 * Handles OTP send, verify, and user profile management
 * 
 * PHP Auth Flow:
 * 1. Send OTP: POST /api/v1/auth/login { login_type: 'otp', phone: '+91...' }
 * 2. Verify OTP: POST /api/v1/auth/login { login_type: 'otp', phone: '+91...', otp: '123456', verified: true }
 * 3. Update Info: POST /api/v1/auth/update-info { login_type: 'otp', phone: '+91...', name: '...', email: '...' }
 */
@Controller('v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly phpAuth: PhpAuthService) {}

  /**
   * Send OTP to phone number
   * POST /v1/auth/send-otp
   * Body: { phone: '9923383838' }
   * 
   * Normalizes phone to +91 format and calls PHP backend
   */
  @Post('send-otp')
  async sendOtp(@Body() body: { phone: string }) {
    const { phone } = body;
    
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    this.logger.log(`📱 Send OTP request for: ${phone}`);

    // Normalize phone number (handles with/without +91, 10 digit, etc.)
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number format');
    }

    this.logger.log(`📱 Normalized phone: ${normalizedPhone}`);

    const result = await this.phpAuth.sendOtp(normalizedPhone);

    if (!result.success) {
      this.logger.warn(`❌ OTP send failed: ${result.message}`);
      throw new BadRequestException(result.message || 'Failed to send OTP');
    }

    this.logger.log(`✅ OTP sent to ${normalizedPhone}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Verify OTP and get auth token
   * POST /v1/auth/verify-otp
   * Body: { phone: '9923383838', otp: '123456' }
   * 
   * Returns: { success, token, is_personal_info, user: { ... } }
   */
  @Post('verify-otp')
  async verifyOtp(@Body() body: { phone: string; otp: string }) {
    const { phone, otp } = body;

    if (!phone || !otp) {
      throw new BadRequestException('Phone and OTP are required');
    }

    this.logger.log(`🔐 Verify OTP request for: ${phone}`);

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number format');
    }

    const result = await this.phpAuth.verifyOtp(normalizedPhone, otp);

    if (!result.success) {
      this.logger.warn(`❌ OTP verification failed: ${result.message}`);
      throw new UnauthorizedException(result.message || 'Invalid OTP');
    }

    this.logger.log(`✅ OTP verified for ${normalizedPhone}`);
    this.logger.debug(`📦 Response data: ${JSON.stringify(result.data)}`);

    // Extract user data from PHP response (type as any to access PHP response fields)
    const phpData: any = result.data || {};
    
    // is_personal_info at root level for frontend compatibility
    // 0 = new user needs to complete registration
    // 1 = existing user with complete profile
    const isPersonalInfo = phpData.is_personal_info ?? 0;
    
    return {
      success: true,
      token: phpData.token || null,
      is_personal_info: isPersonalInfo,
      user: {
        id: phpData.id,
        phone: normalizedPhone,
        f_name: phpData.f_name || '',
        l_name: phpData.l_name || '',
        email: phpData.email || '',
        is_personal_info: isPersonalInfo,
        is_phone_verified: phpData.is_phone_verified ?? 1,
        is_email_verified: phpData.is_email_verified ?? 0,
      },
    };
  }

  /**
   * Update user profile (for new user registration)
   * POST /v1/auth/update-info
   * Body: { phone: '9923383838', f_name: 'John', l_name: 'Doe', email: 'john@example.com' }
   * 
   * Returns: { token, user }
   */
  @Post('update-info')
  async updateUserInfo(
    @Body() body: { phone: string; f_name: string; l_name?: string; email: string },
  ) {
    const { phone, f_name, l_name, email } = body;

    if (!phone || !f_name || !email) {
      throw new BadRequestException('Phone, first name, and email are required');
    }

    this.logger.log(`📝 Update user info for: ${phone}`);

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);
    
    if (!normalizedPhone) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Combine first and last name for PHP (PHP expects single 'name' field)
    const fullName = l_name ? `${f_name} ${l_name}` : f_name;

    const result = await this.phpAuth.updateUserInfo(normalizedPhone, fullName, email);

    if (!result.success) {
      this.logger.warn(`❌ Update info failed: ${result.message}`);
      throw new BadRequestException(result.message || 'Failed to update info');
    }

    this.logger.log(`✅ User info updated for ${normalizedPhone}`);

    return {
      success: true,
      token: result.token,
      user: {
        phone: normalizedPhone,
        f_name,
        l_name: l_name || '',
        email,
        is_personal_info: 1,
      },
    };
  }

  /**
   * Get user profile
   * GET /v1/auth/profile
   * Requires: Authorization header with Bearer token
   */
  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token required');
    }

    const token = authHeader.replace('Bearer ', '');
    
    this.logger.log(`👤 Get profile request`);

    const user = await this.phpAuth.getUserProfile(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.log(`✅ Profile retrieved for user ${user.id}`);

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        f_name: user.firstName,
        l_name: user.lastName || '',
        email: user.email,
        image: user.image || null,
      },
    };
  }

  /**
   * Login with email/password
   * POST /v1/auth/login
   * Body: { phone: 'email@example.com' or '9923383838', password: 'Hello@1506' }
   * 
   * PHP expects:
   * { email_or_phone, password, login_type: 'manual', field_type: 'email' | 'phone' }
   */
  @Post('login')
  async login(@Body() body: { phone: string; password: string }) {
    const { phone, password } = body;

    if (!phone || !password) {
      throw new BadRequestException('Email/phone and password are required');
    }

    this.logger.log(`🔐 Password login request for: ${phone}`);

    // Check if it's email or phone
    const isEmail = phone.includes('@');
    const fieldType = isEmail ? 'email' : 'phone';
    
    // Normalize phone if needed
    let emailOrPhone = phone;
    if (!isEmail) {
      const normalized = normalizePhoneNumber(phone);
      if (!normalized) {
        throw new BadRequestException('Invalid phone number format');
      }
      emailOrPhone = normalized;
    }

    try {
      // Call PHP backend for password login
      const phpData = await this.phpAuth.loginWithPassword(emailOrPhone, password, fieldType);
      
      this.logger.log(`✅ Password login successful for ${phone}`);
      
      return {
        success: true,
        token: phpData.token,
        is_personal_info: phpData.is_personal_info ?? 1,
        user: {
          id: phpData.id,
          phone: phpData.phone || (isEmail ? '' : emailOrPhone),
          email: phpData.email || (isEmail ? phone : ''),
          f_name: phpData.f_name || '',
          l_name: phpData.l_name || '',
          is_personal_info: phpData.is_personal_info ?? 1,
          is_phone_verified: phpData.is_phone_verified ?? 1,
          is_email_verified: phpData.is_email_verified ?? 1,
        },
      };
    } catch (error) {
      this.logger.warn(`❌ Password login failed: ${error.message}`);
      throw new UnauthorizedException(error.message || 'Invalid credentials');
    }
  }

  /**
   * Social login (Google, Facebook, Apple)
   * POST /v1/auth/social-login
   * Body: { token: 'google-id-token', unique_id: '...', email: '...', medium: 'google' }
   */
  @Post('social-login')
  async socialLogin(
    @Body() body: { token: string; unique_id: string; email: string; medium: string },
  ) {
    const { token, unique_id, email, medium } = body;

    if (!token || !medium) {
      throw new BadRequestException('Token and medium are required');
    }

    this.logger.log(`🔐 Social login via ${medium} for: ${email}`);

    // TODO: Implement social login via PHP
    // PHP endpoint: POST /api/v1/auth/social-login
    throw new BadRequestException(`Social login via ${medium} not yet implemented`);
  }

  /**
   * Logout
   * POST /v1/auth/logout
   */
  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    this.logger.log(`👋 Logout request`);

    // For stateless JWT auth, logout is client-side
    // Just acknowledge the request
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
