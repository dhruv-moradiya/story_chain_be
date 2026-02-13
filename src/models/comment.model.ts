import mongoose, { Schema } from 'mongoose';
import { ICommentDoc } from '@features/comment/types/comment.types';

const commentSchema = new Schema<ICommentDoc>({
  chapterSlug: {
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

  // Nested comments
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  },

  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 2000,
  },

  // Voting on comments
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Moderation
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  reportCount: {
    type: Number,
    default: 0,
  },
});

// Indexes
commentSchema.index({ chapterSlug: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

const Comment = mongoose.model<ICommentDoc>('Comment', commentSchema);

export { Comment };
