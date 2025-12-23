import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ConversationMemoryService, ConversationMemoryEntry } from './conversation-memory.service';

/**
 * Conversation Memory Controller
 * 
 * Admin API for managing and querying conversation memory.
 */
@Controller('ai/memory')
export class ConversationMemoryController {
  private readonly logger = new Logger(ConversationMemoryController.name);

  constructor(private readonly memoryService: ConversationMemoryService) {}

  /**
   * Get memory statistics
   */
  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    const stats = await this.memoryService.getStats(tenantId);
    return {
      success: true,
      stats,
      available: this.memoryService.isAvailable(),
    };
  }

  /**
   * Store a memory entry
   */
  @Post('store')
  async storeMemory(@Body() entry: ConversationMemoryEntry) {
    const id = await this.memoryService.store(entry);
    return {
      success: id !== null,
      id,
      message: id ? 'Memory stored successfully' : 'Failed to store memory',
    };
  }

  /**
   * Search for similar memories
   */
  @Post('search')
  async searchSimilar(
    @Body() body: {
      query: string;
      userId?: number;
      sessionId?: string;
      tenantId?: string;
      limit?: number;
      minScore?: number;
    }
  ) {
    const results = await this.memoryService.searchSimilar(body.query, {
      userId: body.userId,
      sessionId: body.sessionId,
      tenantId: body.tenantId,
      limit: body.limit,
      minScore: body.minScore,
    });

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  /**
   * Get recent history for a session
   */
  @Get('session/:sessionId')
  async getSessionHistory(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string
  ) {
    const history = await this.memoryService.getRecentHistory(
      sessionId,
      limit ? parseInt(limit, 10) : 10
    );

    return {
      success: true,
      count: history.length,
      history,
    };
  }

  /**
   * Build context for LLM from memories
   */
  @Post('context')
  async buildContext(
    @Body() body: {
      query: string;
      userId?: number;
      sessionId?: string;
      maxMemories?: number;
    }
  ) {
    const context = await this.memoryService.buildContextFromMemories(
      body.query,
      {
        userId: body.userId,
        sessionId: body.sessionId,
        maxMemories: body.maxMemories,
      }
    );

    return {
      success: true,
      context,
      hasContext: context.length > 0,
    };
  }

  /**
   * Delete memories for a session
   */
  @Delete('session/:sessionId')
  async deleteSessionMemories(@Param('sessionId') sessionId: string) {
    const deleted = await this.memoryService.deleteSessionMemories(sessionId);
    this.logger.log(`🗑️ Deleted ${deleted} memories for session ${sessionId}`);
    
    return {
      success: true,
      deleted,
      message: `Deleted ${deleted} memory entries for session`,
    };
  }

  /**
   * Delete all memories for a user (GDPR compliance)
   */
  @Delete('user/:userId')
  async deleteUserMemories(@Param('userId') userId: string) {
    const deleted = await this.memoryService.deleteUserMemories(parseInt(userId, 10));
    this.logger.log(`🗑️ Deleted ${deleted} memories for user ${userId}`);
    
    return {
      success: true,
      deleted,
      message: `Deleted ${deleted} memory entries for user (GDPR compliance)`,
    };
  }
}
