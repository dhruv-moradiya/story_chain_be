import mongoose, { Schema } from 'mongoose';

import { ICommentVoteDoc } from '@/features/commentVote/types/commentVote.types';

const commentVoteSchema = new Schema<ICommentVoteDoc>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    voteType: {
      type: String,
      enum: ['upvote', 'downvote'],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate voting
commentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentVote = mongoose.model<ICommentVoteDoc>('CommentVote', commentVoteSchema);
