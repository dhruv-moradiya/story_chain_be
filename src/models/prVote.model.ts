import mongoose, { Schema } from 'mongoose';
import { IPRVoteDoc } from '../features/prVote/prVote.types';

const prVoteSchema = new Schema<IPRVoteDoc>({
  pullRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'PullRequest',
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
    enum: [1, -1],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique: one vote per user per PR
prVoteSchema.index({ pullRequestId: 1, userId: 1 }, { unique: true });

const PRVote = mongoose.model('PRVote', prVoteSchema);

export { PRVote };
