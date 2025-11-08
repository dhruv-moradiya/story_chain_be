import mongoose, { Schema } from 'mongoose';
import { IPRNotificationDoc } from '../features/prNotification/prNotification.types';

const prNotificationSchema = new Schema<IPRNotificationDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'PR_OPENED',
        'PR_APPROVED',
        'PR_REJECTED',
        'PR_MERGED',
        'PR_COMMENTED',
        'PR_REVIEW_REQUESTED',
        'PR_CHANGES_REQUESTED',
        'PR_MENTIONED',
      ],
    },
    triggeredBy: {
      type: String,
      ref: 'User',
    },
    message: {
      type: String,
      required: true,
    },
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
prNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const PRNotification = mongoose.model('PRNotification', prNotificationSchema);

export { PRNotification };
