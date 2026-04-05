import mongoose, { Schema } from 'mongoose';
import { IPRReviewDoc } from '@features/prReview/types/prReview.types';
import { PR_REVIEW_DECISIONS } from '@features/prReview/types/prReview-enum';

const prReviewSchema = new Schema<IPRReviewDoc>(
  {
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
      index: true,
    },
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    reviewerId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    // The verdict
    decision: {
      type: String,
      enum: PR_REVIEW_DECISIONS,
      required: true,
      index: true,
    },
    // Written feedback
    summary: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // Revision tracking
    isUpdated: {
      type: Boolean,
      default: false,
    },
    previousDecision: {
      type: String,
    },
    updatedAt_review: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
prReviewSchema.index({ pullRequestId: 1, reviewerId: 1 }, { unique: true });
prReviewSchema.index({ pullRequestId: 1, createdAt: -1 });
prReviewSchema.index({ reviewerId: 1, createdAt: -1 });
prReviewSchema.index({ pullRequestId: 1, decision: 1 });

const PRReview = mongoose.model<IPRReviewDoc>('PRReview', prReviewSchema);

export { PRReview };
