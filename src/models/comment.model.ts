import mongoose, { Schema } from 'mongoose';
import { ICommentDoc } from '../features/comment/comment.types';

const commentSchema = new Schema<ICommentDoc>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
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
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ chapterId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export { Comment };
