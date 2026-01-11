import mongoose, { Schema } from 'mongoose';
import { IPRReviewDoc } from '@features/prReview/types/prReview.types';

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
    /**
     * REVIEW_STATUS: Detailed review progress (non-terminal, changes during process)
     * VALUES:
     *   - PENDING_REVIEW: Waiting for reviewers
     *   - IN_REVIEW: At least one reviewer started
     *   - CHANGES_REQUESTED: Reviewer(s) requested changes, author must update
     *   - APPROVED: All reviews received, all approved
     *   - NEEDS_WORK: Changes requested must be addressed
     *   - DRAFT: Author paused review (uses isDraft field)
     * USE: Show detailed progress in UI, determine next steps
     * UPDATE:
     *   - On creation: PENDING_REVIEW
     *   - When review submitted: IN_REVIEW
     *   - When REQUEST_CHANGES review added: CHANGES_REQUESTED
     *   - When all approvals: APPROVED
     *   - When author marks draft: DRAFT
     * RELATIONSHIP: Works with status field for full state picture
     */
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'NEEDS_WORK', 'DRAFT'],
      default: 'PENDING_REVIEW',
      index: true,
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
