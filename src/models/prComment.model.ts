import mongoose, { Schema } from 'mongoose';
import { IPRCommentDoc } from '@features/prComment/types/prComment.types';
import { PR_COMMENT_TYPES } from '@features/prComment/types/prComment-enum';

const prCommentSchema = new Schema<IPRCommentDoc>(
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
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'PRComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
    },
    commentType: {
      type: String,
      enum: PR_COMMENT_TYPES,
      required: true,
    },
    // For suggestion type only
    suggestion: {
      originalPassage: String,
      suggestedPassage: String,
      context: String,
    },

    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    isResolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: String, ref: 'User' },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
prCommentSchema.index({ pullRequestId: 1, createdAt: 1 });
prCommentSchema.index({ parentCommentId: 1, createdAt: 1 });
prCommentSchema.index({ pullRequestId: 1, isResolved: 1 });
prCommentSchema.index({ userId: 1, createdAt: -1 });

const PRComment = mongoose.model<IPRCommentDoc>('PRComment', prCommentSchema);

export { PRComment };
