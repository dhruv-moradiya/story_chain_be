/**
 * Cache TTL (Time To Live) values in seconds
 * Organized by data access patterns and freshness requirements
 */
export const CACHE_TTL = {
  // ═══════════════════════════════════════════
  // STABLE DATA - Rarely changes
  // ═══════════════════════════════════════════
  STORY_DETAIL: 60 * 60, // 1 hour
  STORY_SETTINGS: 60 * 60, // 1 hour
  USER_PROFILE: 60 * 60, // 1 hour
  CHAPTER_DETAIL: 60 * 30, // 30 minutes

  // ═══════════════════════════════════════════
  // SEMI-STABLE DATA - Changes occasionally
  // ═══════════════════════════════════════════
  STORY_OVERVIEW: 60 * 30, // 30 minutes
  STORY_TREE: 60 * 15, // 15 minutes
  COLLABORATOR_LIST: 60 * 15, // 15 minutes

  // ═══════════════════════════════════════════
  // DYNAMIC LISTS - Updated frequently
  // ═══════════════════════════════════════════
  STORY_LIST_PUBLISHED: 60 * 10, // 10 minutes
  STORY_LIST_NEW: 60 * 5, // 5 minutes
  STORY_LIST_TRENDING: 60 * 5, // 5 minutes
  STORY_LIST_FEATURED: 60 * 15, // 15 minutes
  SEARCH_RESULTS: 60 * 3, // 3 minutes

  // ═══════════════════════════════════════════
  // USER-SPECIFIC DATA
  // ═══════════════════════════════════════════
  USER_STORIES: 60 * 10, // 10 minutes
  USER_DRAFTS: 60 * 5, // 5 minutes
  READING_HISTORY: 60 * 5, // 5 minutes
  NOTIFICATION_COUNT: 60 * 2, // 2 minutes
  NOTIFICATION_LIST: 60 * 5, // 5 minutes

  // ═══════════════════════════════════════════
  // SHORT-LIVED DATA
  // ═══════════════════════════════════════════
  RATE_LIMIT: 60, // 1 minute
  SESSION_DATA: 60 * 30, // 30 minutes
  AUTOSAVE_LOCK: 60 * 2, // 2 minutes
} as const;

export type TCacheTTLKey = keyof typeof CACHE_TTL;

/**
 * Cache key prefixes for different entities
 */
export const CACHE_PREFIX = {
  APP: 'sc', // StoryChain
} as const;
