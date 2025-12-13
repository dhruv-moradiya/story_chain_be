import { TNotificationType } from '../features/notification/notification.types';
import { ID } from '../types';

/* --------------------------------------------------
 * Highlight helper (semantic, UI-agnostic)
 * -------------------------------------------------- */
type HighlightType = 'actor' | 'story' | 'chapter' | 'pr' | 'comment' | 'role' | 'badge';

const highlight = (text?: string, type: HighlightType = 'actor') =>
  text ? `[[${type}:${text}]]` : '';

/* --------------------------------------------------
 * Context passed while building notification
 * actor = user who triggered the notification
 * -------------------------------------------------- */
type NotificationContext = {
  actor?: string;
  storyName?: string;
  chapterName?: string;
  pr?: string;
  comment?: string;
  badge?: string;
  role?: string;

  actorId?: string;
  storyId?: ID;
  chapterId?: string;
  prId?: string;
  commentId?: string;
};

/* --------------------------------------------------
 * URL resolvers (single source of truth)
 * -------------------------------------------------- */
const URL_RESOLVERS = {
  story: ({ storyId }: NotificationContext) => (storyId ? `/story/${storyId}` : null),

  chapter: ({ storyId, chapterId }: NotificationContext) =>
    storyId && chapterId ? `/story/${storyId}/chapter/${chapterId}` : null,

  pr: ({ storyId, prId }: NotificationContext) =>
    storyId && prId ? `/story/${storyId}/pr/${prId}` : null,

  comment: ({ commentId }: NotificationContext) => (commentId ? `/comment/${commentId}` : null),

  user: ({ actorId }: NotificationContext) => (actorId ? `/user/${actorId}` : null),

  badges: () => `/profile/badges`,

  collaborators: ({ storyId }: NotificationContext) =>
    storyId ? `/story/${storyId}/collaborators` : null,
};

/* --------------------------------------------------
 * Notification config per type
 * -------------------------------------------------- */
type NotificationConfig = {
  required?: (keyof NotificationContext)[];
  action?: keyof typeof URL_RESOLVERS | null;
  template: (ctx: NotificationContext) => {
    title: string;
    message: string;
  };
};

const NOTIFICATION_CONFIG: Record<TNotificationType, NotificationConfig> = {
  NEW_BRANCH: {
    required: ['actor', 'storyName', 'storyId'],
    action: 'story',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} created a new branch`,
      message: `${highlight(actor, 'actor')} added a new branch to ${highlight(
        storyName,
        'story'
      )}.`,
    }),
  },

  CHAPTER_UPVOTE: {
    required: ['actor', 'chapterName', 'storyId', 'chapterId'],
    action: 'chapter',
    template: ({ actor, chapterName }) => ({
      title: `Your chapter received an upvote`,
      message: `${highlight(actor, 'actor')} upvoted your chapter ${highlight(
        chapterName,
        'chapter'
      )}.`,
    }),
  },

  STORY_MILESTONE: {
    required: ['storyName', 'storyId'],
    action: 'story',
    template: ({ storyName }) => ({
      title: `Your story reached a new milestone`,
      message: `${highlight(storyName, 'story')} has hit a new milestone! Keep it going.`,
    }),
  },

  STORY_CONTINUED: {
    required: ['actor', 'storyName', 'storyId'],
    action: 'chapter',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} continued your story`,
      message: `${highlight(actor, 'actor')} added a new chapter to ${highlight(
        storyName,
        'story'
      )}.`,
    }),
  },

  PR_OPENED: {
    required: ['actor', 'storyName', 'pr', 'storyId', 'prId'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: `${highlight(actor, 'actor')} opened a pull request`,
      message: `${highlight(actor, 'actor')} created a pull request ${highlight(
        pr,
        'pr'
      )} on ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_APPROVED: {
    required: ['actor', 'storyName', 'pr', 'storyId', 'prId'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: `Your pull request was approved`,
      message: `${highlight(actor, 'actor')} approved your pull request ${highlight(
        pr,
        'pr'
      )} in ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_REJECTED: {
    required: ['actor', 'pr', 'storyId', 'prId'],
    action: 'pr',
    template: ({ actor, pr }) => ({
      title: `Your pull request was rejected`,
      message: `${highlight(actor, 'actor')} requested changes on ${highlight(pr, 'pr')}.`,
    }),
  },

  PR_MERGED: {
    required: ['actor', 'storyName', 'pr', 'storyId', 'prId'],
    action: 'pr',
    template: ({ actor, pr, storyName }) => ({
      title: `Your pull request was merged`,
      message: `${highlight(actor, 'actor')} merged ${highlight(
        pr,
        'pr'
      )} into ${highlight(storyName, 'story')}.`,
    }),
  },

  PR_COMMENTED: {
    required: ['actor', 'pr', 'storyId', 'prId'],
    action: 'pr',
    template: ({ actor, pr }) => ({
      title: `New comment on pull request`,
      message: `${highlight(actor, 'actor')} commented on ${highlight(pr, 'pr')}.`,
    }),
  },

  COMMENT_REPLY: {
    required: ['actor', 'comment', 'commentId'],
    action: 'comment',
    template: ({ actor, comment }) => ({
      title: `${highlight(actor, 'actor')} replied to your comment`,
      message: `${highlight(actor, 'actor')} replied: ${highlight(comment, 'comment')}.`,
    }),
  },

  COMMENT_MENTION: {
    required: ['actor', 'storyName', 'commentId'],
    action: 'comment',
    template: ({ actor, storyName }) => ({
      title: `${highlight(actor, 'actor')} mentioned you`,
      message: `${highlight(actor, 'actor')} mentioned you while discussing ${highlight(
        storyName,
        'story'
      )}.`,
    }),
  },

  MENTION: {
    required: ['actor', 'storyName', 'storyId'],
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
      title: `You earned a new badge`,
      message: `You’ve earned the ${highlight(badge, 'badge')} badge!`,
    }),
  },

  COLLAB_INVITATION: {
    required: ['actor', 'storyName', 'storyId', 'role'],
    action: 'collaborators',
    template: ({ actor, storyName, role }) => ({
      title: `${highlight(actor, 'actor')} invited you to collaborate`,
      message: `${highlight(actor, 'actor')} invited you to join ${highlight(
        storyName,
        'story'
      )} as ${highlight(role, 'role')}.`,
    }),
  },

  COLLAB_INVITATION_APPROVED: {
    required: ['actor', 'storyName', 'storyId'],
    action: 'collaborators',
    template: ({ actor, storyName }) => ({
      title: `Collaboration accepted`,
      message: `${highlight(actor, 'actor')} accepted your collaboration request for ${highlight(
        storyName,
        'story'
      )}.`,
    }),
  },

  COLLAB_INVITATION_REJECTED: {
    required: ['actor', 'storyName', 'storyId'],
    action: 'collaborators',
    template: ({ actor, storyName }) => ({
      title: `Collaboration declined`,
      message: `${highlight(actor, 'actor')} declined your invitation for ${highlight(
        storyName,
        'story'
      )}.`,
    }),
  },
};

/* --------------------------------------------------
 * Notification Factory
 * -------------------------------------------------- */
export class NotificationFactory {
  static build(type: TNotificationType, ctx: NotificationContext) {
    const config = NOTIFICATION_CONFIG[type];

    if (config.required) {
      for (const field of config.required) {
        if (!ctx[field]) {
          throw new Error(`Notification "${type}" requires "${field}"`);
        }
      }
    }

    const { title, message } = config.template(ctx);

    const actionUrl = config.action ? URL_RESOLVERS[config.action](ctx) : null;

    return {
      type,
      title,
      message,
      actionUrl,
    };
  }
}
