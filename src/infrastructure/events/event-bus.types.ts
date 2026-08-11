/**
 * Event Bus Type Definitions
 *
 * Provides central, strongly-typed contracts for all application domain events.
 * To register a new event, simply add its payload definition to `IEventPayloadMap`.
 */

export const APP_EVENTS = {
  // Gamification & XP Events
  CHAPTER_READ: 'gamification:chapter_read',
  CHAPTER_PUBLISHED: 'gamification:chapter_published',
  STORY_CREATED: 'gamification:story_created',
  COMMENT_ADDED: 'gamification:comment_added',
  VOTE_CAST: 'gamification:vote_cast',
  PR_SUBMITTED: 'gamification:pr_submitted',
  PR_MERGED: 'gamification:pr_merged',

  // User & Auth Events
  USER_REGISTERED: 'user:registered',
  USER_UPDATED: 'user:updated',

  // Notification Events
  NOTIFICATION_TRIGGERED: 'notification:triggered',
} as const;

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

/**
 * Mapping of Event Name -> Event Payload
 * Compiler strictly enforces payload shape whenever emit/on/once is called.
 */
export interface IEventPayloadMap {
  // Gamification Events
  [APP_EVENTS.CHAPTER_READ]: {
    userId: string;
    storySlug: string;
    chapterSlug: string;
    readDurationSeconds: number;
    completed: boolean;
  };
  [APP_EVENTS.CHAPTER_PUBLISHED]: {
    authorId: string;
    storySlug: string;
    chapterSlug: string;
    publishedAt: Date;
  };
  [APP_EVENTS.STORY_CREATED]: {
    authorId: string;
    storySlug: string;
    title: string;
    createdAt: Date;
  };
  [APP_EVENTS.COMMENT_ADDED]: {
    userId: string;
    commentId: string;
    chapterSlug: string;
    contentLength: number;
  };
  [APP_EVENTS.VOTE_CAST]: {
    userId: string;
    targetType: 'chapter' | 'comment' | 'pr';
    targetId: string;
    voteType: 'upvote' | 'downvote';
  };
  [APP_EVENTS.PR_SUBMITTED]: {
    authorId: string;
    prId: string;
    storySlug: string;
  };
  [APP_EVENTS.PR_MERGED]: {
    authorId: string;
    prId: string;
    storySlug: string;
    mergedBy: string;
  };

  // User Events
  [APP_EVENTS.USER_REGISTERED]: {
    userId: string;
    email: string;
    username?: string;
  };
  [APP_EVENTS.USER_UPDATED]: {
    userId: string;
    updatedFields: string[];
  };

  // Notification Events
  [APP_EVENTS.NOTIFICATION_TRIGGERED]: {
    recipientUserId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Type utility to get the payload type for a specific event
 */
export type EventPayload<K extends keyof IEventPayloadMap> = IEventPayloadMap[K];

/**
 * Handler function signature for a specific event
 */
export type EventHandler<K extends keyof IEventPayloadMap> = (
  payload: EventPayload<K>
) => void | Promise<void>;

/**
 * Interface contract for the EventBusService
 */
export interface IEventBusService {
  emit<K extends keyof IEventPayloadMap>(event: K, payload: EventPayload<K>): boolean;
  on<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this;
  once<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this;
  off<K extends keyof IEventPayloadMap>(event: K, handler: EventHandler<K>): this;
  removeAllListeners<K extends keyof IEventPayloadMap>(event?: K): this;
  listenerCount<K extends keyof IEventPayloadMap>(event: K): number;
}
