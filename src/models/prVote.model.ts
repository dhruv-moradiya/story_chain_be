import mongoose, { Schema } from 'mongoose';
import { IPRVoteDoc } from '@features/prVote/types/prVote.types';

const prVoteSchema = new Schema<IPRVoteDoc>(
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
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    vote: {
      type: Number,
      required: true,
      enum: [1, -1], // 1 = upvote, -1 = downvote
    },
    previousVote: {
      type: Number,
      enum: [1, -1, null],
      default: null,
    },
    changedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
prVoteSchema.index({ pullRequestId: 1, userId: 1 }, { unique: true });
prVoteSchema.index({ storySlug: 1, createdAt: -1 });
prVoteSchema.index({ userId: 1, createdAt: -1 });

const PRVote = mongoose.model<IPRVoteDoc>('PRVote', prVoteSchema);

export { PRVote };
