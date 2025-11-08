import mongoose, { Schema } from 'mongoose';
import { INotificationDoc } from '../features/notification/notification.types';

const notificationSchema = new Schema<INotificationDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'NEW_BRANCH',
        'COMMENT_REPLY',
        'CHAPTER_UPVOTE',
        'BADGE_EARNED',
        'STORY_MILESTONE',
        'STORY_CONTINUED',
        'MENTION',
        'NEW_FOLLOWER',
      ],
    },

    // References
    relatedStoryId: { type: Schema.Types.ObjectId, ref: 'Story' },
    relatedChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    relatedUserId: { type: String, ref: 'User' },
    relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },

    // Content
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },

    // Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification };
