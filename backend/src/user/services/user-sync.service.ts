import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PhpAuthService } from '../../php-integration/services/php-auth.service';
import { SessionService } from '../../session/session.service';

/**
 * UserSyncService - Synchronizes PHP users to AI database
 * 
 * Critical Service: Links PHP authentication with AI features
 * 
 * Purpose:
 * - Creates persistent user records in PostgreSQL when users login via PHP
 * - Maintains link between PHP user_id and AI user_id
 * - Enables long-term tracking (conversations, games, preferences)
 * - Saves user profile data for personalization
 * 
 * Flow:
 * 1. User logs in via PHP → gets auth_token
 * 2. ConversationService calls syncUser()
 * 3. Fetch user profile from PHP
 * 4. Upsert to PostgreSQL users table
 * 5. Save AI user_id to session
 * 
 * Related Files:
 * - src/conversation/services/conversation.service.ts (calls after login)
 * - src/php-integration/services/php-auth.service.ts (fetches user from PHP)
 * - libs/database/prisma/schema.prisma (User model)
 */
@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);
  private readonly prisma: PrismaClient;

  constructor(
    private readonly phpAuthService: PhpAuthService,
    private readonly sessionService: SessionService,
  ) {
    this.prisma = new PrismaClient();
  }

  /**
   * Sync user from PHP to PostgreSQL after successful authentication
   * 
   * @param phoneNumber - User's phone number (primary identifier)
   * @param authToken - JWT token from PHP authentication
   * @returns User object from PostgreSQL with AI user_id
   */
  async syncUser(
    phoneNumber: string,
    authToken: string,
  ): Promise<{
    id: number;
    phpUserId: number | null;
    phone: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    preferredLanguage: string | null;
  } | null> {
    try {
      this.logger.log(`🔄 Syncing user from PHP: ${phoneNumber}`);

      // 1. Fetch user profile from PHP backend
      const phpUser = await this.phpAuthService.getUserProfile(authToken);
      
      if (!phpUser) {
        this.logger.error(`❌ Failed to fetch user profile from PHP for ${phoneNumber}`);
        return null;
      }

      this.logger.log(`✅ Fetched PHP user: id=${phpUser.id}, name=${phpUser.firstName} ${phpUser.lastName}`);

      // 2. Upsert to PostgreSQL users table
      const aiUser = await this.prisma.user.upsert({
        where: { phone: phoneNumber },
        update: {
          phpUserId: phpUser.id,
          email: phpUser.email,
          firstName: phpUser.firstName,
          lastName: phpUser.lastName,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          phpUserId: phpUser.id,
          phone: phoneNumber,
          email: phpUser.email,
          firstName: phpUser.firstName,
          lastName: phpUser.lastName,
          preferredLanguage: 'en', // Default, can be updated via preference flow
          lastActiveAt: new Date(),
        },
      });

      this.logger.log(`💾 User synced to AI database: ai_user_id=${aiUser.id}, php_user_id=${phpUser.id}`);

      // 3. Save AI user_id and PHP user_id to session for quick access
      await this.sessionService.setData(phoneNumber, {
        ai_user_id: aiUser.id,
        php_user_id: phpUser.id,
        user_info: {
          id: phpUser.id,
          phone: phoneNumber,
          email: phpUser.email,
          firstName: phpUser.firstName,
          lastName: phpUser.lastName,
        },
      });

      this.logger.log(`✅ Session updated with user IDs for ${phoneNumber}`);

      return aiUser;
    } catch (error) {
      this.logger.error(`❌ Error syncing user ${phoneNumber}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Get user from AI database by phone number
   */
  async getUserByPhone(phoneNumber: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { phone: phoneNumber },
      });
    } catch (error) {
      this.logger.error(`Error fetching user by phone ${phoneNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user from AI database by PHP user ID
   */
  async getUserByPhpId(phpUserId: number) {
    try {
      return await this.prisma.user.findUnique({
        where: { phpUserId },
      });
    } catch (error) {
      this.logger.error(`Error fetching user by PHP ID ${phpUserId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update user preferences (language, dietary, communication style, etc.)
   */
  async updatePreferences(phoneNumber: string, preferences: Record<string, any>) {
    try {
      const user = await this.prisma.user.update({
        where: { phone: phoneNumber },
        data: {
          preferences,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`✅ Updated preferences for ${phoneNumber}: ${Object.keys(preferences).join(', ')}`);
      return user;
    } catch (error) {
      this.logger.error(`Error updating preferences for ${phoneNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Update last active timestamp (called on every interaction)
   */
  async updateLastActive(phoneNumber: string) {
    try {
      await this.prisma.user.update({
        where: { phone: phoneNumber },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      // Silent fail - not critical
      this.logger.debug(`Could not update last active for ${phoneNumber}`);
    }
  }

  /**
   * Increment game stats after game completion
   */
  async incrementGameStats(
    phoneNumber: string,
    rewardsEarned: number,
    pointsEarned: number,
  ) {
    try {
      await this.prisma.user.update({
        where: { phone: phoneNumber },
        data: {
          totalGamesPlayed: { increment: 1 },
          totalRewardsEarned: { increment: rewardsEarned },
          loyaltyPoints: { increment: pointsEarned },
        },
      });

      this.logger.log(`✅ Game stats updated for ${phoneNumber}: +₹${rewardsEarned}, +${pointsEarned} points`);
    } catch (error) {
      this.logger.error(`Error updating game stats for ${phoneNumber}: ${error.message}`);
    }
  }
}
