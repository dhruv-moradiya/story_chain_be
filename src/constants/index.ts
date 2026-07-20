// ========================================
// STORYCHAIN CONSTANTS
// All configuration values and limits
// ========================================
import {
  XP_REWARDS,
  XP_TIMING,
  XP_TIMING_LABELS,
  XP_DAILY_CAPS,
  XP_WEEKLY_CAPS,
  XP_DAILY_ACTION_LIMITS,
  XP_QUALITY_GATES,
  XP_DIMINISHING_RETURNS,
  XP_GUARDS,
  XP_SOURCE_TYPES,
  LEVEL_THRESHOLDS,
  BADGES,
  BADGE_CATEGORY,
  STORY_MILESTONE_THRESHOLDS,
  GAMIFICATION_JOBS,
  calculateLevel,
  getLevelTitle,
  getXPForNextLevel,
  checkBadgeEligibility,
  getChapterSurvivalMultiplier,
  calculateChapterSurvivalXP,
} from './gamification';

// Re-export everything from gamification as named exports so callers
// can still do: import { XP_REWARDS, BADGES } from '@/constants'
export {
  XP_REWARDS,
  XP_TIMING,
  XP_TIMING_LABELS,
  XP_DAILY_CAPS,
  XP_WEEKLY_CAPS,
  XP_DAILY_ACTION_LIMITS,
  XP_QUALITY_GATES,
  XP_DIMINISHING_RETURNS,
  XP_GUARDS,
  XP_SOURCE_TYPES,
  LEVEL_THRESHOLDS,
  BADGES,
  BADGE_CATEGORY,
  STORY_MILESTONE_THRESHOLDS,
  GAMIFICATION_JOBS,
  calculateLevel,
  getLevelTitle,
  getXPForNextLevel,
  checkBadgeEligibility,
  getChapterSurvivalMultiplier,
  calculateChapterSurvivalXP,
};
export type { BadgeId, XPRewardKey, XPSourceType } from './gamification';

export const cloudinaryUrlRegex =
  /^https:\/\/res\.cloudinary\.com\/[a-z0-9-_]+\/(image|video|raw)\/upload\/.+$/i;

// ========================================
// ROLE DEFINITIONS & PERMISSIONS
// ========================================

// Platform Role Definitions
export const PLATFORM_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Administrator',
    description: 'Full platform control',
    permissions: {
      canBanUsers: true,
      canUnbanUsers: true,
      canViewAllReports: true,
      canDeleteAnyContent: true,
      canReviewAppeals: true,
      canApproveAppeals: true,
      canRejectAppeals: true,
      canEscalateAppeals: true,
      canManageRoles: true,
      canAssignModerators: true,
      canAccessAdminPanel: true,
      canViewPlatformAnalytics: true,
      canManageSettings: true,
      canManageFeaturedContent: true,
    },
  },

  PLATFORM_MODERATOR: {
    name: 'Platform Moderator',
    description: 'Moderate content across all stories',
    permissions: {
      canBanUsers: true,
      canUnbanUsers: false,
      canViewAllReports: true,
      canDeleteAnyContent: true,
      canReviewAppeals: true,
      canApproveAppeals: false,
      canRejectAppeals: true,
      canEscalateAppeals: true,
      canManageRoles: false,
      canAssignModerators: false,
      canAccessAdminPanel: true,
      canViewPlatformAnalytics: false,
      canManageSettings: false,
      canManageFeaturedContent: false,
    },
  },

  APPEAL_MODERATOR: {
    name: 'Appeal Moderator',
    description: 'Review and decide on ban appeals',
    permissions: {
      canBanUsers: false,
      canUnbanUsers: true,
      canViewAllReports: true,
      canDeleteAnyContent: false,
      canReviewAppeals: true,
      canApproveAppeals: true,
      canRejectAppeals: true,
      canEscalateAppeals: true,
      canManageRoles: false,
      canAssignModerators: false,
      canAccessAdminPanel: true,
      canViewPlatformAnalytics: false,
      canManageSettings: false,
      canManageFeaturedContent: false,
    },
  },

  USER: {
    name: 'Regular User',
    description: 'Standard user account',
    permissions: {
      canBanUsers: false,
      canUnbanUsers: false,
      canViewAllReports: false,
      canDeleteAnyContent: false,
      canReviewAppeals: false,
      canApproveAppeals: false,
      canRejectAppeals: false,
      canEscalateAppeals: false,
      canManageRoles: false,
      canAssignModerators: false,
      canAccessAdminPanel: false,
      canViewPlatformAnalytics: false,
      canManageSettings: false,
      canManageFeaturedContent: false,
    },
  },
} as const;

// ========================================
// CHAPTER VALIDATION
// ========================================
export const CHAPTER_LIMITS = {
  CONTENT: {
    MIN_LENGTH: 50,
    MAX_LENGTH: 80000,
  },
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  DEPTH: {
    MAX: 50,
  },
  BRANCHES: {
    MAX_PER_CHAPTER: 10,
  },
} as const;

// ========================================
// STORY VALIDATION
// ========================================
export const STORY_LIMITS = {
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 2000,
  },
  SLUG: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  TAGS: {
    MAX_COUNT: 10,
    MAX_LENGTH_PER_TAG: 30,
  },
} as const;

// ========================================
// USER VALIDATION
// ========================================
export const USER_LIMITS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

// ========================================
// COMMENT VALIDATION
// ========================================
export const COMMENT_LIMITS = {
  CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000,
  },
  NESTING: {
    MAX_DEPTH: 5, // Maximum nested reply levels
  },
} as const;

// ========================================
// PULL REQUEST VALIDATION
// ========================================
export const PR_LIMITS = {
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MAX_LENGTH: 2000,
  },
  REVIEW_NOTES: {
    MAX_LENGTH: 1000,
  },
  REJECTION_REASON: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },
  AUTO_APPROVE: {
    DEFAULT_THRESHOLD: 10,
    DEFAULT_TIME_WINDOW_DAYS: 7,
    MIN_THRESHOLD: 5,
    MAX_THRESHOLD: 50,
  },
} as const;

// ========================================
// REPORT VALIDATION
// ========================================
export const REPORT_LIMITS = {
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  RESOLUTION: {
    MAX_LENGTH: 1000,
  },
} as const;

// ========================================
// NOTIFICATION LIMITS
// ========================================
export const NOTIFICATION_LIMITS = {
  TITLE: {
    MAX_LENGTH: 100,
  },
  MESSAGE: {
    MAX_LENGTH: 500,
  },
  RETENTION_DAYS: 90, // Auto-delete read notifications after 90 days
} as const;

// ========================================
// BOOKMARK LIMITS
// ========================================
export const BOOKMARK_LIMITS = {
  NOTE: {
    MAX_LENGTH: 500,
  },
  MAX_PER_USER: 100, // Maximum bookmarks per user
} as const;

export const TRENDING_WEIGHTS = {
  READS_LAST_7_DAYS: 0.3,
  VOTES_LAST_7_DAYS: 0.2,
  NEW_BRANCHES_LAST_7_DAYS: 0.2,
  TOTAL_VOTES: 0.2,
  AUTHOR_LEVEL: 0.1,
} as const;

export const TRENDING_CONSTANTS = {
  BRANCH_MULTIPLIER: 20,
  AUTHOR_LEVEL_MULTIPLIER: 10,
  TIME_WINDOW_DAYS: 7,
  RECALCULATION_INTERVAL_HOURS: 6,
} as const;

export function calculateTrendingScore(metrics: {
  readsLast7Days: number;
  votesLast7Days: number;
  newBranchesLast7Days: number;
  totalVotes: number;
  authorLevel: number;
}): number {
  return (
    metrics.readsLast7Days * TRENDING_WEIGHTS.READS_LAST_7_DAYS +
    metrics.votesLast7Days * TRENDING_WEIGHTS.VOTES_LAST_7_DAYS +
    metrics.newBranchesLast7Days *
      TRENDING_CONSTANTS.BRANCH_MULTIPLIER *
      TRENDING_WEIGHTS.NEW_BRANCHES_LAST_7_DAYS +
    metrics.totalVotes * TRENDING_WEIGHTS.TOTAL_VOTES +
    metrics.authorLevel * TRENDING_CONSTANTS.AUTHOR_LEVEL_MULTIPLIER * TRENDING_WEIGHTS.AUTHOR_LEVEL
  );
}

// ========================================
// PAGINATION
// ========================================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

export function validatePagination(page?: number, limit?: number) {
  const validPage = Math.max(page || PAGINATION.DEFAULT_PAGE, 1);
  const validLimit = Math.min(
    Math.max(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MIN_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  return { page: validPage, limit: validLimit };
}

// ========================================
// RATE LIMITING
// ========================================
export const RATE_LIMITS = {
  // API rate limits (per hour)
  AUTHENTICATED: {
    REQUESTS_PER_HOUR: 1000,
    CHAPTER_CREATE_PER_HOUR: 50,
    COMMENT_CREATE_PER_HOUR: 100,
    VOTE_PER_HOUR: 200,
    PR_SUBMIT_PER_HOUR: 20,
  },
  UNAUTHENTICATED: {
    REQUESTS_PER_HOUR: 100,
  },

  // Content creation cooldowns (seconds)
  COOLDOWNS: {
    CHAPTER_CREATE: 60, // 1 minute between chapters
    COMMENT_CREATE: 10, // 10 seconds between comments
    PR_SUBMIT: 300, // 5 minutes between PRs
    STORY_CREATE: 60 * 60 * 24, // 1 day between stories
  },
} as const;

// ========================================
// CONTENT MODERATION
// ========================================
export const MODERATION = {
  AUTO_FLAG: {
    REPORT_THRESHOLD: 5, // Auto-flag after 5 reports
    DOWNVOTE_THRESHOLD: -10, // Auto-flag at -10 votes
  },
  BAN: {
    TEMPORARY_DAYS: [1, 3, 7, 30],
    PERMANENT: Infinity,
  },
  SPAM: {
    MAX_LINKS_PER_CONTENT: 3,
    MIN_TIME_BETWEEN_POSTS_SECONDS: 30,
  },
} as const;

// ========================================
// FILE UPLOAD
// ========================================
export const FILE_UPLOAD = {
  COVER_IMAGE: {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
  },
  AVATAR: {
    MAX_SIZE_MB: 2,
    MAX_SIZE_BYTES: 2 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_WIDTH: 512,
    MAX_HEIGHT: 512,
  },
} as const;

// ========================================
// SEARCH & DISCOVERY
// ========================================
export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  MAX_RESULTS: 50,
  DEBOUNCE_MS: 300,
} as const;

// ========================================
// NOTIFICATION SETTINGS
// ========================================
export const NOTIFICATION_DEFAULTS = {
  EMAIL: {
    new_follower: true,
    story_continued: true,
    chapter_upvote: false,
    comment_reply: true,
    pr_opened: true,
    pr_approved: true,
    pr_rejected: true,
    badge_earned: true,
    story_milestone: true,
  },
  PUSH: {
    new_follower: true,
    story_continued: true,
    chapter_upvote: false,
    comment_reply: true,
    pr_opened: true,
    pr_approved: true,
    pr_rejected: true,
    badge_earned: true,
    story_milestone: true,
  },
} as const;

// ========================================
// TIME CONSTANTS
// ========================================
export const TIME = {
  MILLISECONDS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000,
  },
  SECONDS: {
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 24 * 60 * 60,
    WEEK: 7 * 24 * 60 * 60,
    MONTH: 30 * 24 * 60 * 60,
    YEAR: 365 * 24 * 60 * 60,
  },
} as const;

// ========================================
// ENUMS
// ========================================
export enum StoryGenre {
  FANTASY = 'FANTASY',
  SCI_FI = 'SCI_FI',
  MYSTERY = 'MYSTERY',
  ROMANCE = 'ROMANCE',
  HORROR = 'HORROR',
  THRILLER = 'THRILLER',
  ADVENTURE = 'ADVENTURE',
  DRAMA = 'DRAMA',
  COMEDY = 'COMEDY',
  OTHER = 'OTHER',
}

export enum ContentRating {
  GENERAL = 'GENERAL',
  TEEN = 'TEEN',
  MATURE = 'MATURE',
}

export enum ChapterStatus {
  PUBLISHED = 'PUBLISHED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

export enum PRStatus {
  OPEN = 'open',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  MERGED = 'merged',
}

export enum PRType {
  NEW_CHAPTER = 'new_chapter',
  EDIT_CHAPTER = 'edit_chapter',
  DELETE_CHAPTER = 'delete_chapter',
}

export enum CollaboratorRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  REVIEWER = 'REVIEWER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  COPYRIGHT = 'COPYRIGHT',
  OFF_TOPIC = 'OFF_TOPIC',
  OTHER = 'OTHER',
}

// ========================================
// REGEX PATTERNS
// ========================================
export const PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9-]+$/,
  URL: /^https?:\/\/.+/,
  SAFE_HTML: /<script|<iframe|javascript:/gi, // Patterns to reject
} as const;

// ========================================
// EXPORT ALL
// ========================================
export default {
  CHAPTER_LIMITS,
  STORY_LIMITS,
  USER_LIMITS,
  COMMENT_LIMITS,
  PR_LIMITS,
  REPORT_LIMITS,
  NOTIFICATION_LIMITS,
  BOOKMARK_LIMITS,
  XP_REWARDS,
  XP_TIMING,
  XP_DAILY_CAPS,
  XP_WEEKLY_CAPS,
  XP_DAILY_ACTION_LIMITS,
  XP_QUALITY_GATES,
  XP_DIMINISHING_RETURNS,
  XP_GUARDS,
  LEVEL_THRESHOLDS,
  BADGES,
  BADGE_CATEGORY,
  STORY_MILESTONE_THRESHOLDS,
  GAMIFICATION_JOBS,
  TRENDING_WEIGHTS,
  TRENDING_CONSTANTS,
  PAGINATION,
  RATE_LIMITS,
  MODERATION,
  FILE_UPLOAD,
  SEARCH,
  NOTIFICATION_DEFAULTS,
  TIME,
  PATTERNS,
};
