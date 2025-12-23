import { Injectable, Logger } from '@nestjs/common';
import { SessionService } from '../../session/session.service';
import { UserProfilingService } from '../../personalization/user-profiling.service';

/**
 * 🧠 Search Memory Service
 * 
 * Remembers search context within a conversation:
 * - Recent searches in session
 * - Clicked items
 * - Search refinements
 * - Cross-sell opportunities
 */

export interface SearchMemoryEntry {
  query: string;
  timestamp: Date;
  resultsCount: number;
  clickedItems?: Array<{
    id: number;
    name: string;
    clicked_at: Date;
  }>;
  module: 'food' | 'ecom';
}

export interface SessionSearchContext {
  recentSearches: SearchMemoryEntry[];
  lastSearch?: SearchMemoryEntry;
  clickedItemIds: number[];
  searchCount: number;
  sessionStartedAt: Date;
}

@Injectable()
export class SearchMemoryService {
  private readonly logger = new Logger(SearchMemoryService.name);
  private readonly MAX_RECENT_SEARCHES = 10;

  constructor(
    private readonly sessionService: SessionService,
    private readonly userProfilingService: UserProfilingService,
  ) {
    this.logger.log('✅ SearchMemoryService initialized');
  }

  /**
   * Record a search in session memory
   */
  async recordSearch(
    sessionId: string,
    query: string,
    module: 'food' | 'ecom',
    resultsCount: number,
    userId?: number,
  ): Promise<void> {
    try {
      // Get or initialize search context
      const context = await this.getSearchContext(sessionId);
      
      const entry: SearchMemoryEntry = {
        query,
        timestamp: new Date(),
        resultsCount,
        module,
      };

      // Add to recent searches (keep last N)
      context.recentSearches.unshift(entry);
      if (context.recentSearches.length > this.MAX_RECENT_SEARCHES) {
        context.recentSearches.pop();
      }

      context.lastSearch = entry;
      context.searchCount++;

      // Save to session
      await this.sessionService.setData(sessionId, {
        _search_context: context,
      });

      // Also track in persistent storage if user is authenticated
      if (userId) {
        await this.userProfilingService.trackSearch({
          userId,
          query,
          module,
        });
      }

      this.logger.debug(`Recorded search: "${query}" for session ${sessionId}`);
    } catch (error) {
      this.logger.warn(`Failed to record search: ${error.message}`);
    }
  }

  /**
   * Record a click on a search result
   */
  async recordClick(
    sessionId: string,
    itemId: number,
    itemName: string,
    userId?: number,
  ): Promise<void> {
    try {
      const context = await this.getSearchContext(sessionId);

      // Add to clicked items
      if (!context.clickedItemIds.includes(itemId)) {
        context.clickedItemIds.push(itemId);
      }

      // Update last search with clicked item
      if (context.lastSearch) {
        if (!context.lastSearch.clickedItems) {
          context.lastSearch.clickedItems = [];
        }
        context.lastSearch.clickedItems.push({
          id: itemId,
          name: itemName,
          clicked_at: new Date(),
        });
      }

      // Save to session
      await this.sessionService.setData(sessionId, {
        _search_context: context,
      });

      // Track in persistent storage
      if (userId && context.lastSearch) {
        await this.userProfilingService.trackSearch({
          userId,
          query: context.lastSearch.query,
          module: context.lastSearch.module,
          clickedItemId: itemId,
        });
      }

      this.logger.debug(`Recorded click: item ${itemId} for session ${sessionId}`);
    } catch (error) {
      this.logger.warn(`Failed to record click: ${error.message}`);
    }
  }

  /**
   * Get search context for a session
   */
  async getSearchContext(sessionId: string): Promise<SessionSearchContext> {
    try {
      const session = await this.sessionService.getSession(sessionId);
      const existing = session?.data?._search_context as SessionSearchContext;

      if (existing) {
        return existing;
      }
    } catch (error) {
      this.logger.debug(`No existing search context: ${error.message}`);
    }

    // Return default context
    return {
      recentSearches: [],
      clickedItemIds: [],
      searchCount: 0,
      sessionStartedAt: new Date(),
    };
  }

  /**
   * Get search suggestions based on conversation context
   */
  async getSearchSuggestions(sessionId: string): Promise<string[]> {
    const context = await this.getSearchContext(sessionId);
    const suggestions: string[] = [];

    if (!context.lastSearch) {
      return suggestions;
    }

    const lastQuery = context.lastSearch.query;
    const lastModule = context.lastSearch.module;

    // Suggest refinements based on what they searched
    if (lastModule === 'food') {
      // Food-specific suggestions
      if (lastQuery.toLowerCase().includes('biryani')) {
        suggestions.push('chicken biryani', 'mutton biryani', 'veg biryani');
      } else if (lastQuery.toLowerCase().includes('pizza')) {
        suggestions.push('cheese pizza', 'pepperoni pizza', 'veggie pizza');
      } else if (lastQuery.toLowerCase().includes('burger')) {
        suggestions.push('chicken burger', 'veg burger', 'cheese burger');
      }
    }

    // Suggest based on what they clicked
    if (context.clickedItemIds.length > 0 && context.lastSearch?.clickedItems) {
      const clickedNames = context.lastSearch.clickedItems.map(i => i.name.toLowerCase());
      
      // If they clicked on a specific cuisine, suggest similar
      const cuisineKeywords = ['chinese', 'italian', 'indian', 'mexican', 'thai'];
      for (const cuisine of cuisineKeywords) {
        if (clickedNames.some(name => name.includes(cuisine))) {
          suggestions.push(`more ${cuisine} food`);
          break;
        }
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Get context string for LLM prompts
   */
  async getContextForLLM(sessionId: string): Promise<string> {
    const context = await this.getSearchContext(sessionId);

    if (context.searchCount === 0) {
      return '';
    }

    const parts: string[] = [];
    
    if (context.lastSearch) {
      parts.push(`Last search: "${context.lastSearch.query}" (${context.lastSearch.resultsCount} results)`);
    }

    if (context.lastSearch?.clickedItems?.length) {
      const names = context.lastSearch.clickedItems.map(i => i.name).join(', ');
      parts.push(`Viewed items: ${names}`);
    }

    if (context.recentSearches.length > 1) {
      const others = context.recentSearches.slice(1, 4).map(s => s.query);
      parts.push(`Previous searches: ${others.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Check if user is refining their search
   */
  async isRefinement(sessionId: string, newQuery: string): Promise<boolean> {
    const context = await this.getSearchContext(sessionId);
    
    if (!context.lastSearch) {
      return false;
    }

    const lastQuery = context.lastSearch.query.toLowerCase();
    const current = newQuery.toLowerCase();

    // Check if new query contains last query (refinement)
    if (current.includes(lastQuery) || lastQuery.includes(current)) {
      return true;
    }

    // Check for common refinement patterns
    const refinementPatterns = [
      /more\s+like/i,
      /similar\s+to/i,
      /another/i,
      /different/i,
      /cheaper/i,
      /better/i,
      /veg\s+version/i,
      /non[- ]?veg/i,
    ];

    return refinementPatterns.some(pattern => pattern.test(current));
  }

  /**
   * Get items user has already seen (to avoid repeating)
   */
  async getSeenItemIds(sessionId: string): Promise<number[]> {
    const context = await this.getSearchContext(sessionId);
    return context.clickedItemIds;
  }

  /**
   * Clear search memory (e.g., when starting fresh)
   */
  async clearMemory(sessionId: string): Promise<void> {
    await this.sessionService.setData(sessionId, {
      _search_context: null,
    });
    this.logger.debug(`Cleared search memory for session ${sessionId}`);
  }
}
