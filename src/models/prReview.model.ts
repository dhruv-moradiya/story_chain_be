import mongoose, { Schema } from 'mongoose';
import { IPRReviewDoc } from '../features/prReview/prReview.types';

const prReviewSchema = new Schema<IPRReviewDoc>(
  {
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
      index: true,
    },
    reviewerId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    decision: {
      type: String,
      required: true,
      enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'],
    },
    summary: {
      type: String,
      maxlength: 2000,
    },
    feedback: [
      {
        section: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
      },
    ],
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
prReviewSchema.index({ pullRequestId: 1, createdAt: -1 });
prReviewSchema.index({ reviewerId: 1 });

const PRReview = mongoose.model('PRReview', prReviewSchema);

export { PRReview };
