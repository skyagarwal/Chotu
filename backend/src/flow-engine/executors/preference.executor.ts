import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { UserPreferenceService } from '../../personalization/user-preference.service';

@Injectable()
export class PreferenceExecutor implements ActionExecutor {
  readonly name = 'preference';
  private readonly logger = new Logger(PreferenceExecutor.name);

  constructor(private readonly preferenceService: UserPreferenceService) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const userId = context._system.userId;
      const key = config.key;
      const valuePath = config.valuePath;
      const staticValue = config.value;

      if (!userId) {
        throw new Error('User ID is missing in context');
      }

      let value = staticValue;
      if (valuePath) {
        // Resolve value from context data using dot notation
        value = valuePath.split('.').reduce((o, i) => (o ? o[i] : undefined), context.data);
      }

      if (value === undefined) {
        this.logger.warn(`Preference value is undefined for key ${key}`);
        return { success: false, error: 'Value is undefined' };
      }

      // Handle array fields - wrap single values in array
      const arrayFields = ['allergies', 'favorite_cuisines', 'dietary_restrictions', 'disliked_ingredients'];
      if (arrayFields.includes(key) && !Array.isArray(value)) {
        if (value === 'none') {
            value = [];
        } else {
            value = [value];
        }
      }

      // Convert string userId to number if needed (Prisma schema uses Int)
      const userIdInt = parseInt(userId.toString(), 10);
      if (isNaN(userIdInt)) {
         throw new Error(`Invalid User ID: ${userId}`);
      }

      this.logger.log(`Updating preference for user ${userIdInt}: ${key} = ${value}`);
      await this.preferenceService.updatePreference(userIdInt, key, value);

      return {
        success: true,
        output: { key, value },
      };
    } catch (error) {
      this.logger.error(`Preference update failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validate(config: Record<string, any>): boolean {
    return !!config.key && (config.value !== undefined || !!config.valuePath);
  }
}
