import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PhpApiService } from '../../php-integration/services/php-api.service';
import { GamificationSettingsService } from './gamification-settings.service';

/**
 * GameRewardService - Handles reward crediting via PHP wallet API
 */
@Injectable()
export class GameRewardService {
  private readonly logger = new Logger(GameRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phpApi: PhpApiService,
    private readonly settings: GamificationSettingsService,
  ) {}

  /**
   * Credit reward for completed game
   */
  async creditReward(
    userId: number,
    gameType: string,
    sessionId: string,
    authToken: string,
  ): Promise<string | null> {
    try {
      const rewardAmount = await this.settings.getRewardAmount(gameType);
      if (rewardAmount <= 0) {
        this.logger.warn(`No reward configured for game type: ${gameType}`);
        return null;
      }

      const payload = {
        user_id: userId,
        amount: rewardAmount,
        transaction_type: 'add_fund_by_admin',
        reference: `GAME_${gameType.toUpperCase()}_${sessionId}`,
        note: `Reward for completing ${gameType} game`,
      };

      const response = await this.phpApi['authenticatedRequest'](
        'post',
        '/api/v1/admin/wallet/add-fund-by-admin',
        authToken,
        payload,
      );

      const transactionId = response?.transaction_id;
      this.logger.log(`✅ Reward credited: ₹${rewardAmount} → user${userId} (TXN: ${transactionId})`);
      return transactionId;
    } catch (error) {
      this.logger.error(`❌ Failed to credit reward:`, error);
      throw error;
    }
  }

  async getUserTotalRewards(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalRewardsEarned: true },
    });
    return Number(user?.totalRewardsEarned || 0);
  }
}
