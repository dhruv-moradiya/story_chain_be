import mongoose, { Schema } from 'mongoose';
import { IPullRequestDoc } from '@features/pullRequest/types/pullRequest.types';
import {
  PR_LABELS,
  PR_STATUSES,
  PR_TYPES,
  PRStatus,
  PRType,
} from '@features/pullRequest/types/pullRequest-enum';

const pullRequestSchema = new Schema<IPullRequestDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    // References
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    chapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    parentChapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // PR Type
    prType: {
      type: String,
      enum: PR_TYPES,
      default: PRType.NEW_BRANCH,
    },

    // Content
    content: {
      proposed: {
        type: String,
        required: true,
        maxlength: 100000,
      },
      wordCount: Number,
      readingMinutes: Number,
    },

    // Status
    status: {
      type: String,
      enum: PR_STATUSES,
      default: PRStatus.OPEN,
      required: true,
      index: true,
    },

    // Community votes (aggregate — source of truth is PRVote)
    votes: {
      upvotes: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
      },
      downvotes: {
        type: Number,
        default: 0,
        min: 0,
      },
      score: {
        type: Number,
        default: 0,
        index: true,
      },
    },

    commentCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    // Auto-approval config (set at creation from story settings)
    autoApprove: {
      enabled: {
        type: Boolean,
        default: false,
      },
      threshold: {
        type: Number,
        default: 10,
        min: 1,
      },
      timeWindow: {
        type: Number,
        default: 7,
        min: 1,
      },
      qualifiedAt: Date,
      autoApprovedAt: Date,
    },

    // Labels (applied by moderator+)
    labels: [
      {
        type: String,
        enum: PR_LABELS,
      },
    ],

    // Draft
    isDraft: {
      type: Boolean,
      default: false,
    },
    draftReason: String,
    draftedAt: Date,

    // Merge / close info
    mergedAt: Date,
    mergedBy: {
      type: String,
      ref: 'User',
    },
    closedAt: Date,
    closedBy: {
      type: String,
      ref: 'User',
    },
    closeReason: {
      type: String,
      maxlength: 500,
    },

    // Approvals tracking
    approvalsStatus: {
      required: {
        type: Number,
        default: 1,
      },
      received: {
        type: Number,
        default: 0,
      },
      pending: {
        type: Number,
        default: 0,
      },
      approvers: [String],
      blockers: [String],
      canMerge: {
        type: Boolean,
        default: false,
      },
    },

    // Stats
    stats: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      discussions: {
        type: Number,
        default: 0,
        min: 0,
      },
      reviewsReceived: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
pullRequestSchema.index({ storySlug: 1, status: 1, createdAt: -1 });
pullRequestSchema.index({ storySlug: 1, prType: 1, status: 1 });
pullRequestSchema.index({ authorId: 1, status: 1 });
pullRequestSchema.index({ parentChapterSlug: 1, status: 1 });
pullRequestSchema.index({ 'votes.score': -1 });
pullRequestSchema.index({ storySlug: 1, labels: 1, status: 1 });

const PullRequest = mongoose.model<IPullRequestDoc>('PullRequest', pullRequestSchema);

export { PullRequest };
