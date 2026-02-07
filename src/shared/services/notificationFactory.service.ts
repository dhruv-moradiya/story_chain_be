import { TNotificationType } from '@features/notification/types/notification.types.js';
import { ID } from '@/types/index.js';
import { AppError } from '@infrastructure/errors/app-error.js';
import { ErrorCode } from '@infrastructure/errors/error-codes.js';

// ═══════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════

/**
 * Highlight types for notification message formatting
 * Used by frontend to apply appropriate styling
 */
export type HighlightType = 'actor' | 'story' | 'chapter' | 'pr' | 'comment' | 'role' | 'badge';

/**
 * Context passed while building a notification
 * Actor = user who triggered the notification
 */
export interface NotificationContext {
  // Display names
  actor?: string;
  storyName?: string;
  chapterName?: string;
  pr?: string;
  comment?: string;
  badge?: string;
  role?: string;

  // IDs for URL generation
  actorId?: string;
  storyId?: ID;
  storySlug?: string;
  chapterId?: string;
  chapterSlug?: string;
  prId?: string;
  commentId?: string;
}

/**
 * Result of building a notification
 */
export interface NotificationBuildResult {
  type: TNotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
}

/**
 * Validation result with error details
 */
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: keyof NotificationContext;
    code: ErrorCode;
    message: string;
  }>;
}

/**
 * Configuration for a notification type
 */
interface NotificationTypeConfig {
  /** Required fields for this notification type */
  required: (keyof NotificationContext)[];
  /** Action type for URL generation */
  action: ActionType | null;
  /** Template function for generating title and message */
  template: (ctx: NotificationContext) => {
    title: string;
    message: string;
  };
}

/**
 * Action types for URL generation
 */
type ActionType = 'story' | 'chapter' | 'pr' | 'comment' | 'user' | 'badges' | 'collaborators';

// ═══════════════════════════════════════════
// HIGHLIGHT HELPER
// ═══════════════════════════════════════════

/**
 * Create semantic highlight markup for notification text
 * Frontend will parse these markers to apply styling
 *
 * @example
 * highlight('John', 'actor') => "[[actor:John]]"
 * highlight('My Story', 'story') => "[[story:My Story]]"
 */
const highlight = (text?: string, type: HighlightType = 'actor'): string => {
  return text ? `[[${type}:${text}]]` : '';
};

// ═══════════════════════════════════════════
// URL RESOLVERS
// ═══════════════════════════════════════════

/**
 * URL resolver functions for different action types
 * Single source of truth for notification action URLs
 */
const URL_RESOLVERS: Record<ActionType, (ctx: NotificationContext) => string | null> = {
  story: (ctx) => {
    if (ctx.storySlug) return `/story/${ctx.storySlug}`;
    if (ctx.storyId) return `/story/${ctx.storyId}`;
    return null;
  },

  chapter: (ctx) => {
    const storyRef = ctx.storySlug || ctx.storyId;
    const chapterRef = ctx.chapterSlug || ctx.chapterId;
    if (storyRef && chapterRef) return `/story/${storyRef}/chapter/${chapterRef}`;
    return null;
  },

  pr: (ctx) => {
    const storyRef = ctx.storySlug || ctx.storyId;
    if (storyRef && ctx.prId) return `/story/${storyRef}/pr/${ctx.prId}`;
    return null;
  },

  comment: (ctx) => {
    if (ctx.commentId) return `/comment/${ctx.commentId}`;
    return null;
  },

  user: (ctx) => {
    if (ctx.actorId) return `/user/${ctx.actorId}`;
    return null;
  },

  badges: () => '/profile/badges',

  collaborators: (ctx) => {
    const storyRef = ctx.storySlug || ctx.storyId;
    if (storyRef) return `/story/${storyRef}/collaborators`;
    return null;
  },
};

// ═══════════════════════════════════════════
// NOTIFICATION CONFIGURATIONS
// ═══════════════════════════════════════════

const NOTIFICATION_CONFIGS: Record<TNotificationType, NotificationTypeConfig> = {
  NEW_BRANCH: {
    required: ['actor', 'storyName'],
    action: 'story',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} created a new branch`,
      message: `${highlight(actor, 'actor')} added a new branch to ${highlight(storyName, 'story')}.`,
    }),
  },

  CHAPTER_UPVOTE: {
    required: ['actor', 'chapterName'],
    action: 'chapter',
    template: ({ actor, chapterName }) => ({
      title: 'Your chapter received an upvote',
      message: `${highlight(actor, 'actor')} upvoted your chapter ${highlight(chapterName, 'chapter')}.`,
    }),
  },

  STORY_MILESTONE: {
    required: ['storyName'],
    action: 'story',
    template: ({ storyName }) => ({
      title: 'Your story reached a new milestone',
      message: `${highlight(storyName, 'story')} has hit a new milestone! Keep it going.`,
    }),
  },

  STORY_CONTINUED: {
    required: ['actor', 'storyName'],
    action: 'chapter',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} continued your story`,
      message: `${highlight(actor, 'actor')} added a new chapter to ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_OPENED: {
    required: ['actor', 'storyName', 'pr'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: `${highlight(actor, 'actor')} opened a pull request`,
      message: `${highlight(actor, 'actor')} created a pull request ${highlight(pr, 'pr')} on ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_APPROVED: {
    required: ['actor', 'storyName', 'pr'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: 'Your pull request was approved',
      message: `${highlight(actor, 'actor')} approved your pull request ${highlight(pr, 'pr')} in ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_REJECTED: {
    required: ['actor', 'pr'],
    action: 'pr',
    template: ({ actor, pr }) => ({
      title: 'Your pull request was rejected',
      message: `${highlight(actor, 'actor')} requested changes on ${highlight(pr, 'pr')}.`,
    }),
  },

  PR_MERGED: {
    required: ['actor', 'storyName', 'pr'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: 'Your pull request was merged',
      message: `${highlight(actor, 'actor')} merged ${highlight(pr, 'pr')} into ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_COMMENTED: {
    required: ['actor', 'pr'],
    action: 'pr',
    template: ({ actor, pr }) => ({
      title: 'New comment on pull request',
      message: `${highlight(actor, 'actor')} commented on ${highlight(pr, 'pr')}.`,
    }),
  },

  COMMENT_REPLY: {
    required: ['actor', 'comment'],
    action: 'comment',
    template: ({ actor, comment }) => ({
      title: `${highlight(actor, 'actor')} replied to your comment`,
      message: `${highlight(actor, 'actor')} replied: ${highlight(comment, 'comment')}.`,
    }),
  },

  COMMENT_MENTION: {
    required: ['actor', 'storyName'],
    action: 'comment',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} mentioned you`,
      message: `${highlight(actor, 'actor')} mentioned you while discussing ${highlight(storyName, 'story')}.`,
    }),
  },

  MENTION: {
    required: ['actor', 'storyName'],
    action: 'story',
    template: ({ actor }) => ({
      title: `${highlight(actor, 'actor')} mentioned you`,
      message: `${highlight(actor, 'actor')} mentioned you in a discussion.`,
    }),
  },

  NEW_FOLLOWER: {
    required: ['actor', 'actorId'],
    action: 'user',
    template: ({ actor }) => ({
      title: `${highlight(actor, 'actor')} started following you`,
      message: `${highlight(actor, 'actor')} is now following your work.`,
    }),
  },

  BADGE_EARNED: {
    required: ['badge'],
    action: 'badges',
    template: ({ badge }) => ({
      title: 'You earned a new badge',
      message: `You've earned the ${highlight(badge, 'badge')} badge!`,
    }),
  },

  COLLAB_INVITATION: {
    required: ['actor', 'storyName', 'role'],
    action: 'collaborators',
    template: ({ actor, storyName, role }) => ({
      title: `${highlight(actor, 'actor')} invited you to collaborate`,
      message: `${highlight(actor, 'actor')} invited you to join ${highlight(storyName, 'story')} as ${highlight(role, 'role')}.`,
    }),
  },

  COLLAB_INVITATION_APPROVED: {
    required: ['actor', 'storyName'],
    action: 'collaborators',
    template: ({ actor, storyName }) => ({
      title: 'Collaboration accepted',
      message: `${highlight(actor, 'actor')} accepted your collaboration request for ${highlight(storyName, 'story')}.`,
    }),
  },

  COLLAB_INVITATION_REJECTED: {
    required: ['actor', 'storyName'],
    action: 'collaborators',
    template: ({ actor, storyName }) => ({
      title: 'Collaboration declined',
      message: `${highlight(actor, 'actor')} declined your invitation for ${highlight(storyName, 'story')}.`,
    }),
  },
};

// ═══════════════════════════════════════════
// FIELD TO ERROR CODE MAPPING
// ═══════════════════════════════════════════

const FIELD_ERROR_CODES: Record<keyof NotificationContext, ErrorCode> = {
  actor: 'VALIDATION_FAILED',
  storyName: 'STORY_SLUG_REQUIRED',
  chapterName: 'CHAPTER_SLUG_REQUIRED',
  pr: 'VALIDATION_FAILED',
  comment: 'VALIDATION_FAILED',
  badge: 'VALIDATION_FAILED',
  role: 'ROLE_REQUIRED',
  actorId: 'USER_ID_REQUIRED',
  storyId: 'STORY_SLUG_REQUIRED',
  storySlug: 'STORY_SLUG_REQUIRED',
  chapterId: 'CHAPTER_SLUG_REQUIRED',
  chapterSlug: 'CHAPTER_SLUG_REQUIRED',
  prId: 'VALIDATION_FAILED',
  commentId: 'VALIDATION_FAILED',
};

// ═══════════════════════════════════════════
// NOTIFICATION FACTORY CLASS
// ═══════════════════════════════════════════

/**
 * NotificationFactory - Builds notification objects from type and context
 *
 * Features:
 * - Type-safe notification building
 * - Validation with proper error codes
 * - URL generation for action links
 * - Highlight markup for frontend styling
 * - i18n-ready error messages
 *
 * @example
 * // Build a notification
 * const notification = NotificationFactory.build('COLLAB_INVITATION', {
 *   actor: 'John Doe',
 *   storyName: 'My Adventure',
 *   storySlug: 'my-adventure',
 *   role: 'Editor',
 * });
 *
 * @example
 * // Validate context before building
 * const validation = NotificationFactory.validate('COLLAB_INVITATION', context);
 * if (!validation.isValid) {
 *   throw new AppError(validation.errors[0].code, 400, {
 *     message: validation.errors[0].message,
 *     field: validation.errors[0].field,
 *   });
 * }
 */
export class NotificationFactory {
  /**
   * Build a notification object from type and context
   *
   * @throws AppError if required fields are missing
   */
  static build(type: TNotificationType, ctx: NotificationContext): NotificationBuildResult {
    const config = NOTIFICATION_CONFIGS[type];

    if (!config) {
      throw new AppError('VALIDATION_FAILED', 400, {
        message: `Unknown notification type: ${type}`,
        details: { type },
      });
    }

    // Validate required fields
    const validation = this.validate(type, ctx);
    if (!validation.isValid) {
      const firstError = validation.errors[0];
      throw new AppError(firstError.code, 400, {
        message: firstError.message,
        field: firstError.field,
        details: {
          notificationType: type,
          errors: validation.errors,
        },
      });
    }

    // Build notification
    const { title, message } = config.template(ctx);
    const actionUrl = config.action ? URL_RESOLVERS[config.action](ctx) : null;

    return {
      type,
      title,
      message,
      actionUrl,
    };
  }

  /**
   * Validate context for a notification type without building
   * Useful for checking before expensive operations
   */
  static validate(type: TNotificationType, ctx: NotificationContext): ValidationResult {
    const config = NOTIFICATION_CONFIGS[type];

    if (!config) {
      return {
        isValid: false,
        errors: [
          {
            field: 'actor', // Default field
            code: 'VALIDATION_FAILED',
            message: `Unknown notification type: ${type}`,
          },
        ],
      };
    }

    const errors: ValidationResult['errors'] = [];

    for (const field of config.required) {
      const value = ctx[field];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          code: FIELD_ERROR_CODES[field] || 'MISSING_REQUIRED_FIELD',
          message: `${this.formatFieldName(field)} is required for ${type} notification`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if notification type requires action URL fields
   */
  static requiresActionUrl(type: TNotificationType): boolean {
    const config = NOTIFICATION_CONFIGS[type];
    return config?.action !== null;
  }

  /**
   * Get required fields for a notification type
   */
  static getRequiredFields(type: TNotificationType): (keyof NotificationContext)[] {
    const config = NOTIFICATION_CONFIGS[type];
    return config?.required || [];
  }

  /**
   * Get all supported notification types
   */
  static getSupportedTypes(): TNotificationType[] {
    return Object.keys(NOTIFICATION_CONFIGS) as TNotificationType[];
  }

  /**
   * Check if a notification type is supported
   */
  static isSupported(type: string): type is TNotificationType {
    return type in NOTIFICATION_CONFIGS;
  }

  /**
   * Format field name for error messages
   */
  private static formatFieldName(field: keyof NotificationContext): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Create highlight markup for text
   * Exposed for use in custom notification templates
   */
  static highlight(text: string | undefined, type: HighlightType): string {
    return highlight(text, type);
  }
}

// ═══════════════════════════════════════════
// CONVENIENCE BUILDERS
// ═══════════════════════════════════════════

/**
 * Pre-configured builders for common notification types
 * Provides better type safety and auto-completion
 */
export const NotificationBuilders = {
  /**
   * Build collaboration invitation notification
   */
  collabInvitation(params: {
    actorName: string;
    storyName: string;
    storySlug: string;
    role: string;
  }): NotificationBuildResult {
    return NotificationFactory.build('COLLAB_INVITATION', {
      actor: params.actorName,
      storyName: params.storyName,
      storySlug: params.storySlug,
      role: params.role,
    });
  },

  /**
   * Build new follower notification
   */
  newFollower(params: { followerName: string; followerId: string }): NotificationBuildResult {
    return NotificationFactory.build('NEW_FOLLOWER', {
      actor: params.followerName,
      actorId: params.followerId,
    });
  },

  /**
   * Build new branch notification
   */
  newBranch(params: {
    authorName: string;
    storyName: string;
    storySlug: string;
  }): NotificationBuildResult {
    return NotificationFactory.build('NEW_BRANCH', {
      actor: params.authorName,
      storyName: params.storyName,
      storySlug: params.storySlug,
    });
  },

  /**
   * Build chapter upvote notification
   */
  chapterUpvote(params: {
    voterName: string;
    chapterName: string;
    storySlug: string;
    chapterSlug: string;
  }): NotificationBuildResult {
    return NotificationFactory.build('CHAPTER_UPVOTE', {
      actor: params.voterName,
      chapterName: params.chapterName,
      storySlug: params.storySlug,
      chapterSlug: params.chapterSlug,
    });
  },

  /**
   * Build badge earned notification
   */
  badgeEarned(params: { badgeName: string }): NotificationBuildResult {
    return NotificationFactory.build('BADGE_EARNED', {
      badge: params.badgeName,
    });
  },
};
