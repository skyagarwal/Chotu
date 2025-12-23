import { Injectable, Logger } from '@nestjs/common';
import { ActionExecutor, ActionExecutionResult, FlowContext } from '../types/flow.types';
import { SessionService } from '../../session/session.service';

/**
 * Session Executor
 * 
 * Provides ability to read/write session data from flows
 * Useful for storing location, preferences, and other user context
 */
@Injectable()
export class SessionExecutor implements ActionExecutor {
  readonly name = 'session';
  private readonly logger = new Logger(SessionExecutor.name);

  constructor(private readonly sessionService: SessionService) {}

  async execute(
    config: Record<string, any>,
    context: FlowContext
  ): Promise<ActionExecutionResult> {
    try {
      const action = config.action as string; // 'save', 'get', 'update', 'delete'
      const sessionId = context._system.sessionId;

      if (!sessionId) {
        throw new Error('Session ID is missing in context');
      }

      switch (action) {
        case 'save':
        case 'update':
          return await this.handleSave(config, context, sessionId);
        
        case 'get':
          return await this.handleGet(config, context, sessionId);
        
        case 'delete':
          return await this.handleDelete(config, context, sessionId);
        
        default:
          throw new Error(`Unknown session action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Session operation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save/update data to session
   * Config options:
   * - key: The key to save under (e.g., 'location', 'location_address')
   * - value: Static value to save
   * - valuePath: Path to value in context data (e.g., 'extracted_location.lat')
   * - data: Object with multiple key-value pairs to save
   */
  private async handleSave(
    config: Record<string, any>,
    context: FlowContext,
    sessionId: string
  ): Promise<ActionExecutionResult> {
    let dataToSave: Record<string, any> = {};

    // Option 1: Single key-value
    if (config.key) {
      let value = config.value;
      if (config.valuePath) {
        value = this.resolvePath(context.data, config.valuePath);
      }
      dataToSave[config.key] = value;
    }

    // Option 2: Multiple key-values via data object
    if (config.data) {
      for (const [key, valueConfig] of Object.entries(config.data)) {
        if (typeof valueConfig === 'object' && valueConfig !== null && 'valuePath' in valueConfig) {
          dataToSave[key] = this.resolvePath(context.data, (valueConfig as any).valuePath);
        } else if (typeof valueConfig === 'object' && valueConfig !== null && 'value' in valueConfig) {
          dataToSave[key] = (valueConfig as any).value;
        } else {
          dataToSave[key] = valueConfig;
        }
      }
    }

    // Save location with structure if it's a location update
    if (dataToSave.location && typeof dataToSave.location === 'object') {
      const loc = dataToSave.location;
      if (loc.lat !== undefined && loc.lng !== undefined) {
        dataToSave.location = { lat: loc.lat, lng: loc.lng };
      }
    }

    this.logger.log(`💾 Saving to session ${sessionId}: ${JSON.stringify(Object.keys(dataToSave))}`);
    
    await this.sessionService.updateSession(sessionId, dataToSave);

    // Also update context so subsequent states have access
    context.data._session = {
      ...(context.data._session || {}),
      ...dataToSave,
    };

    return {
      success: true,
      output: dataToSave,
      event: 'session_updated',
    };
  }

  /**
   * Get data from session
   * Config options:
   * - key: Specific key to get
   * - keys: Array of keys to get
   */
  private async handleGet(
    config: Record<string, any>,
    context: FlowContext,
    sessionId: string
  ): Promise<ActionExecutionResult> {
    const session = await this.sessionService.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
        event: 'session_not_found',
      };
    }

    let output: Record<string, any> = {};

    if (config.key) {
      output[config.key] = session.data[config.key];
    } else if (config.keys && Array.isArray(config.keys)) {
      for (const key of config.keys) {
        output[key] = session.data[key];
      }
    } else {
      // Return all session data
      output = session.data;
    }

    return {
      success: true,
      output,
      event: 'session_retrieved',
    };
  }

  /**
   * Delete data from session
   * Config options:
   * - key: Specific key to delete
   * - keys: Array of keys to delete
   */
  private async handleDelete(
    config: Record<string, any>,
    context: FlowContext,
    sessionId: string
  ): Promise<ActionExecutionResult> {
    const session = await this.sessionService.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    const keysToDelete = config.keys || (config.key ? [config.key] : []);
    
    for (const key of keysToDelete) {
      delete session.data[key];
      if (context.data._session) {
        delete context.data._session[key];
      }
    }

    await this.sessionService.saveSession(sessionId, session);

    this.logger.log(`🗑️ Deleted from session ${sessionId}: ${keysToDelete.join(', ')}`);

    return {
      success: true,
      output: { deletedKeys: keysToDelete },
      event: 'session_keys_deleted',
    };
  }

  /**
   * Resolve a dot-notation path to a value in an object
   */
  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
  }

  validate(config: Record<string, any>): boolean {
    const validActions = ['save', 'update', 'get', 'delete'];
    return validActions.includes(config.action);
  }
}
