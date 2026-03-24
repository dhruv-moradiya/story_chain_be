export const TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,
  WEEK: 60 * 60 * 24 * 7,
} as const;

/**
 * Cache TTL (Time To Live) values in seconds
 * Organized by data access patterns and freshness requirements
 */
export const CACHE_TTL = {
  // ═══════════════════════════════════════════
  // STABLE DATA - Rarely changes
  // ═══════════════════════════════════════════
  STORY_AGGREGATE: TIME.WEEK, // 7 days
  STORY_DETAIL: TIME.HOUR,
  STORY_SETTINGS: TIME.HOUR,
  STORY_STATS: 2 * TIME.MINUTE,
  USER_PROFILE: TIME.HOUR,
  CHAPTER_DETAIL: 30 * TIME.MINUTE,
  STORY_COLLABORATOR: 20 * TIME.MINUTE,
  STORY_COLLABORATOR_LIST: 20 * TIME.MINUTE,
  STORY_LATEST_CHAPTERS: 20 * TIME.MINUTE,

  // ═══════════════════════════════════════════
  // SEMI-STABLE DATA
  // ═══════════════════════════════════════════
  STORY_OVERVIEW: 30 * TIME.MINUTE,
  STORY_TREE: 15 * TIME.MINUTE,
  COLLABORATOR_LIST: 15 * TIME.MINUTE,
  COLLABORATOR_ROLE: 5 * TIME.MINUTE,
  PULL_REQUEST_METADATA: 10 * TIME.MINUTE,

  // ═══════════════════════════════════════════
  // DYNAMIC LISTS
  // ═══════════════════════════════════════════
  STORY_LIST_PUBLISHED: 10 * TIME.MINUTE,
  STORY_LIST_NEW: 5 * TIME.MINUTE,
  STORY_LIST_TRENDING: 5 * TIME.MINUTE,
  STORY_LIST_FEATURED: 15 * TIME.MINUTE,
  SEARCH_RESULTS: 3 * TIME.MINUTE,

  // ═══════════════════════════════════════════
  // USER-SPECIFIC DATA
  // ═══════════════════════════════════════════
  USER_STORIES: 10 * TIME.MINUTE,
  USER_DRAFTS: 5 * TIME.MINUTE,
  READING_HISTORY: 5 * TIME.MINUTE,
  NOTIFICATION_COUNT: 2 * TIME.MINUTE,
  NOTIFICATION_LIST: 5 * TIME.MINUTE,
  PULL_REQUEST_VOTE_SUMMARY: 2 * TIME.MINUTE,
  PULL_REQUEST_USER_VOTE: 5 * TIME.MINUTE,

  // ═══════════════════════════════════════════
  // PULL REQUEST DATA
  // ═══════════════════════════════════════════
  PULL_REQUEST: 5 * TIME.MINUTE,
  PR_VOTE_STATS: 30 * TIME.SECOND,

  // ═══════════════════════════════════════════
  // SHORT-LIVED DATA
  // ═══════════════════════════════════════════
  RATE_LIMIT: 1 * TIME.MINUTE,
  SESSION_DATA: 30 * TIME.MINUTE,
  AUTOSAVE_LOCK: 2 * TIME.MINUTE,
} as const;

export type TCacheTTLKey = keyof typeof CACHE_TTL;

/**
 * Cache key prefixes for different entities
 */
export const CACHE_PREFIX = {
  APP: 'sc', // StoryChain
} as const;

export const CRON = {
  EVERY_SECOND: '* * * * * *',
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',

  EVERY_HOUR: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_12_HOURS: '0 */12 * * *',

  EVERY_DAY: '0 0 * * *',
  EVERY_WEEK: '0 0 * * 0', // Sunday
  EVERY_MONTH: '0 0 1 * *',
} as const;

/**
 * Usage examples
 * cron.everyMinutes(10)   // * /10 * * * *
 * cron.everyHours(2)      // 0 * /2 * * *
 * cron.dailyAt(2)         // 0 2 * * *
 * cron.weeklyAt(1, 3)     // Monday 3 AM
 */
export const cron = {
  everyMinutes: (n: number) => `*/${n} * * * *`,
  everyHours: (n: number) => `0 */${n} * * *`,
  dailyAt: (hour: number, minute = 0) => `${minute} ${hour} * * *`,
  weeklyAt: (day: number, hour = 0, minute = 0) => `${minute} ${hour} * * ${day}`, // 0 = Sunday
};

export const JOB_CRON = {
  SYNC_VOTE_COUNTS: CRON.EVERY_10_MINUTES,
};
