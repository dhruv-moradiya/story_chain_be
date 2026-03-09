import mongoose, { Schema } from 'mongoose';
import { INotificationDoc } from '@features/notification/types/notification.types';
import { NOTIFICATION_TYPES } from '@features/notification/types/notification-enum';

// One notification collection handles EVERYTHING
const notificationSchema = new Schema<INotificationDoc>({
  userId: { type: String, ref: 'User', required: true, index: true },

  // Type determines what kind of notification it is
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    index: true,
  },

  // Generic references (only use what's relevant for each type)
  relatedStorySlug: { type: String, ref: 'Story' },
  relatedChapterSlug: { type: String, ref: 'Chapter' },
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
