import mongoose, { Schema } from 'mongoose';
import { IPRCommentDoc } from '../features/prComment/prComment.types';

const prCommentSchema = new Schema<IPRCommentDoc>(
  {
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
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'PRComment',
      default: null,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
    },
    commentType: {
      type: String,
      enum: ['GENERAL', 'SUGGESTION', 'QUESTION', 'APPROVAL', 'REQUEST_CHANGES'],
      default: 'GENERAL',
    },
    suggestion: {
      line: Number,
      originalText: String,
      suggestedText: String,
    },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: String, ref: 'User' },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
prCommentSchema.index({ pullRequestId: 1, createdAt: 1 });
prCommentSchema.index({ userId: 1, createdAt: -1 });

const PRComment = mongoose.model('PRComment', prCommentSchema);

export { PRComment };
