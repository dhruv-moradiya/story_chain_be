import mongoose, { Schema } from 'mongoose';
import { INotificationDoc } from '../features/notification/notification.types';

// One notification collection handles EVERYTHING
const notificationSchema = new Schema<INotificationDoc>({
  userId: { type: String, ref: 'User', required: true, index: true },

  // Type determines what kind of notification it is
  type: {
    type: String,
    enum: [
      // Chapter/Story notifications
      'NEW_BRANCH',
      'CHAPTER_UPVOTE',
      'STORY_MILESTONE',
      'STORY_CONTINUED',

      // PR notifications
      'PR_OPENED',
      'PR_APPROVED',
      'PR_REJECTED',
      'PR_MERGED',
      'PR_COMMENTED',

      // Comment notifications
      'COMMENT_REPLY',
      'COMMENT_MENTION',

      // User notifications
      'MENTION',
      'NEW_FOLLOWER',
      'BADGE_EARNED',

      'COLLAB_INVITATION',
      'COLLAB_INVITATION_APPROVED',
      'COLLAB_INVITATION_REJECTED',
    ],
    required: true,
    index: true,
  },

  // Generic references (only use what's relevant for each type)
  relatedStorySlug: { type: String, ref: 'Story' },
  relatedChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
  relatedPullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest' },
  relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  relatedUserId: { type: String, ref: 'User' }, // Who triggered it

  // Content
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Status
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,

  // Action (optional link to take user to relevant page)
  actionUrl: String,
});

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification };
