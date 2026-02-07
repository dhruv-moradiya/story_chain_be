import { CACHE_PREFIX } from './cache.constants.js';

/**
 * Entity types for cache keys
 */
export type CacheEntity =
  | 'story'
  | 'chapter'
  | 'user'
  | 'notification'
  | 'collaborator'
  | 'reading-history'
  | 'autosave'
  | 'search'
  | 'session';

/**
 * Operation types for cache keys
 */
export type CacheOperation =
  | 'detail'
  | 'list'
  | 'tree'
  | 'count'
  | 'search'
  | 'overview'
  | 'settings'
  | 'drafts'
  | 'unread';

/**
 * Options for building cache keys
 */
interface KeyBuilderOptions {
  entity: CacheEntity;
  operation: CacheOperation;
  identifiers?: Record<string, string | number>;
  variant?: string;
}

/**
 * CacheKeyBuilder - Generates consistent, predictable cache keys
 *
 * @description
 * This utility class provides a centralized way to generate cache keys
 * following a consistent pattern: `{prefix}:{entity}:{operation}:{identifiers}:{variant}`
 *
 * @example
 * // Using convenience methods
 * CacheKeyBuilder.storyDetail('my-adventure') // => "sc:story:detail:slug=my-adventure"
 * CacheKeyBuilder.userProfile('clerk_123')    // => "sc:user:detail:clerkId=clerk_123"
 *
 * // Using generic build method
 * CacheKeyBuilder.build({
 *   entity: 'story',
 *   operation: 'list',
 *   identifiers: { userId: 'user_123' },
 *   variant: 'published'
 * }) // => "sc:story:list:userId=user_123:published"
 */
export class CacheKeyBuilder {
  private static readonly SEPARATOR = ':';
  private static readonly APP_PREFIX = CACHE_PREFIX.APP;

  // ═══════════════════════════════════════════
  // CORE BUILD METHODS
  // ═══════════════════════════════════════════

  /**
   * Build a cache key with consistent format
   *
   * @param options - Key building options
   * @returns Formatted cache key string
   *
   * @example
   * CacheKeyBuilder.build({
   *   entity: 'story',
   *   operation: 'detail',
   *   identifiers: { slug: 'my-story' }
   * })
   * // Returns: "sc:story:detail:slug=my-story"
   */
  static build(options: KeyBuilderOptions): string {
    const { entity, operation, identifiers, variant } = options;

    const parts: string[] = [this.APP_PREFIX, entity, operation];

    // Add sorted identifiers for consistency
    if (identifiers && Object.keys(identifiers).length > 0) {
      const sortedKeys = Object.keys(identifiers).sort();
      for (const key of sortedKeys) {
        parts.push(`${key}=${identifiers[key]}`);
      }
    }

    // Add variant if present
    if (variant) {
      parts.push(variant);
    }

    return parts.join(this.SEPARATOR);
  }

  /**
   * Build pattern for cache invalidation (wildcards)
   *
   * @param options - Partial key building options
   * @returns Pattern string with wildcard
   *
   * @example
   * CacheKeyBuilder.pattern({ entity: 'story' })
   * // Returns: "sc:story:*"
   *
   * CacheKeyBuilder.pattern({ entity: 'story', operation: 'list' })
   * // Returns: "sc:story:list:*"
   */
  static pattern(options: Partial<KeyBuilderOptions>): string {
    const { entity, operation } = options;

    const parts: string[] = [this.APP_PREFIX];

    if (entity) {
      parts.push(entity);
      if (operation) {
        parts.push(operation);
      }
    }

    parts.push('*');
    return parts.join(this.SEPARATOR);
  }

  // ═══════════════════════════════════════════
  // STORY KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for story detail by slug
   * @example "sc:story:detail:slug=my-adventure"
   */
  static storyDetail(slug: string): string {
    return this.build({
      entity: 'story',
      operation: 'detail',
      identifiers: { slug },
    });
  }

  /**
   * Cache key for story chapter tree
   * @example "sc:story:tree:slug=my-adventure"
   */
  static storyTree(slug: string): string {
    return this.build({
      entity: 'story',
      operation: 'tree',
      identifiers: { slug },
    });
  }

  /**
   * Cache key for story overview (with creator/collaborators)
   * @example "sc:story:overview:slug=my-adventure"
   */
  static storyOverview(slug: string): string {
    return this.build({
      entity: 'story',
      operation: 'overview',
      identifiers: { slug },
    });
  }

  /**
   * Cache key for story settings
   * @example "sc:story:settings:slug=my-adventure"
   */
  static storySettings(slug: string): string {
    return this.build({
      entity: 'story',
      operation: 'settings',
      identifiers: { slug },
    });
  }

  /**
   * Cache key for published/new/featured story lists
   * @example "sc:story:list:published"
   */
  static storyList(variant: 'published' | 'new' | 'featured' | 'trending'): string {
    return this.build({
      entity: 'story',
      operation: 'list',
      variant,
    });
  }

  /**
   * Cache key for a user's stories
   * @example "sc:story:list:userId=user_123"
   */
  static userStories(userId: string): string {
    return this.build({
      entity: 'story',
      operation: 'list',
      identifiers: { userId },
    });
  }

  /**
   * Cache key for a user's draft stories
   * @example "sc:story:drafts:userId=user_123"
   */
  static userDrafts(userId: string): string {
    return this.build({
      entity: 'story',
      operation: 'drafts',
      identifiers: { userId },
    });
  }

  // ═══════════════════════════════════════════
  // CHAPTER KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for chapter detail
   * @example "sc:chapter:detail:chapterSlug=ch-1:storySlug=my-adventure"
   */
  static chapterDetail(storySlug: string, chapterSlug: string): string {
    return this.build({
      entity: 'chapter',
      operation: 'detail',
      identifiers: { storySlug, chapterSlug },
    });
  }

  /**
   * Cache key for chapter list by story
   * @example "sc:chapter:list:storySlug=my-adventure"
   */
  static chapterList(storySlug: string): string {
    return this.build({
      entity: 'chapter',
      operation: 'list',
      identifiers: { storySlug },
    });
  }

  // ═══════════════════════════════════════════
  // USER KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for user profile
   * @example "sc:user:detail:clerkId=clerk_abc123"
   */
  static userProfile(clerkId: string): string {
    return this.build({
      entity: 'user',
      operation: 'detail',
      identifiers: { clerkId },
    });
  }

  // ═══════════════════════════════════════════
  // NOTIFICATION KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for unread notification count
   * @example "sc:notification:count:userId=user_123"
   */
  static notificationCount(userId: string): string {
    return this.build({
      entity: 'notification',
      operation: 'count',
      identifiers: { userId },
    });
  }

  /**
   * Cache key for notification list
   * @example "sc:notification:list:userId=user_123:unread"
   */
  static notificationList(userId: string, variant?: 'unread' | 'all'): string {
    return this.build({
      entity: 'notification',
      operation: 'list',
      identifiers: { userId },
      variant,
    });
  }

  // ═══════════════════════════════════════════
  // COLLABORATOR KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for story collaborators list
   * @example "sc:collaborator:list:storySlug=my-adventure"
   */
  static collaboratorList(storySlug: string): string {
    return this.build({
      entity: 'collaborator',
      operation: 'list',
      identifiers: { storySlug },
    });
  }

  // ═══════════════════════════════════════════
  // READING HISTORY KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for user's reading history for a story
   * @example "sc:reading-history:detail:storySlug=my-adventure:userId=user_123"
   */
  static readingHistory(userId: string, storySlug: string): string {
    return this.build({
      entity: 'reading-history',
      operation: 'detail',
      identifiers: { userId, storySlug },
    });
  }

  /**
   * Cache key for user's reading history list
   * @example "sc:reading-history:list:userId=user_123"
   */
  static readingHistoryList(userId: string): string {
    return this.build({
      entity: 'reading-history',
      operation: 'list',
      identifiers: { userId },
    });
  }

  // ═══════════════════════════════════════════
  // SEARCH KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for search results
   * @example "sc:search:list:query=adventure:type=story"
   */
  static searchResults(query: string, type: 'story' | 'chapter' | 'user'): string {
    // Sanitize query for cache key (remove special chars, limit length)
    const sanitizedQuery = query
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 50);

    return this.build({
      entity: 'search',
      operation: 'list',
      identifiers: { query: sanitizedQuery, type },
    });
  }

  // ═══════════════════════════════════════════
  // AUTOSAVE KEYS
  // ═══════════════════════════════════════════

  /**
   * Cache key for autosave lock (prevent concurrent edits)
   * @example "sc:autosave:detail:chapterSlug=ch-1:userId=user_123"
   */
  static autosaveLock(chapterSlug: string, userId: string): string {
    return this.build({
      entity: 'autosave',
      operation: 'detail',
      identifiers: { chapterSlug, userId },
    });
  }

  // ═══════════════════════════════════════════
  // INVALIDATION HELPERS
  // ═══════════════════════════════════════════

  /**
   * Get all keys that should be invalidated when a story changes
   * @returns Array of specific keys and patterns to invalidate
   */
  static invalidateStory(slug: string): string[] {
    return [
      this.storyDetail(slug),
      this.storyTree(slug),
      this.storyOverview(slug),
      this.storySettings(slug),
      this.collaboratorList(slug),
      this.chapterList(slug),
    ];
  }

  /**
   * Pattern to invalidate all story lists
   * @returns Wildcard pattern for story lists
   */
  static invalidateAllStoryLists(): string {
    return this.pattern({ entity: 'story', operation: 'list' });
  }

  /**
   * Get all keys that should be invalidated when user data changes
   * @returns Array of specific keys to invalidate
   */
  static invalidateUserData(userId: string): string[] {
    return [
      this.userProfile(userId),
      this.userStories(userId),
      this.userDrafts(userId),
      this.notificationCount(userId),
      this.notificationList(userId),
      this.readingHistoryList(userId),
    ];
  }

  /**
   * Get all keys that should be invalidated when a chapter changes
   * @returns Array of specific keys to invalidate
   */
  static invalidateChapter(storySlug: string, chapterSlug: string): string[] {
    return [
      this.chapterDetail(storySlug, chapterSlug),
      this.chapterList(storySlug),
      this.storyTree(storySlug),
    ];
  }

  /**
   * Pattern to invalidate all search results
   * @returns Wildcard pattern for search results
   */
  static invalidateAllSearchResults(): string {
    return this.pattern({ entity: 'search' });
  }
}
