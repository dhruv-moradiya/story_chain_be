import mongoose, { Schema } from 'mongoose';
import { IPullRequestDoc } from '../features/pullRequest/pullRequest.types';

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
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    parentChapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
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
      enum: ['NEW_CHAPTER', 'EDIT_CHAPTER', 'DELETE_CHAPTER'],
      default: 'NEW_CHAPTER',
    },

    // Changes
    changes: {
      original: String,
      proposed: {
        type: String,
        required: true,
      },
      diff: String,
    },

    // Status
    status: {
      type: String,
      enum: ['OPEN', 'APPROVED', 'REJECTED', 'CLOSED', 'MERGED'],
      default: 'OPEN',
      index: true,
    },

    // Review
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: { type: String, maxlength: 1000 },
    rejectionReason: { type: String, maxlength: 500 },

    // Voting
    votes: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },

    // Comments
    commentCount: { type: Number, default: 0 },

    // Auto-approve
    autoApprove: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 10 },
      timeWindow: { type: Number, default: 7 },
    },

    // Labels
    labels: [
      {
        type: String,
        enum: ['NEEDS_REVIEW', 'QUALITY_ISSUE', 'GRAMMAR', 'PLOT_HOLE', 'GOOD_FIRST_PR'],
      },
    ],

    // Merge info
    mergedAt: Date,
    mergedBy: { type: String, ref: 'User' },

    // Stats
    stats: {
      views: { type: Number, default: 0 },
      discussions: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
pullRequestSchema.index({ storyId: 1, status: 1, createdAt: -1 });
pullRequestSchema.index({ authorId: 1, status: 1 });
pullRequestSchema.index({ 'votes.score': -1 });

const PullRequest = mongoose.model('PullRequest', pullRequestSchema);

export { PullRequest };
