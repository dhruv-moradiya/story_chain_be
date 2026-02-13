import mongoose, { Schema } from 'mongoose';
import { IVoteDoc } from '@features/vote/types/vote.types';

const voteSchema = new Schema<IVoteDoc>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      index: true,
    },
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
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
  },
  {
    timestamps: true,
  }
);

// Ensure one vote per user per chapter
voteSchema.index(
  { chapterId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { chapterId: { $exists: true } },
  }
);

// Ensure one vote per user per story
voteSchema.index(
  { storyId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { storyId: { $exists: true } },
  }
);

// Validation to ensure either chapterId or storyId is present, but not both
voteSchema.pre('validate', function (next) {
  if (!this.chapterId && !this.storyId) {
    next(new Error('Vote must belong to either a Chapter or a Story'));
  } else if (this.chapterId && this.storyId) {
    next(new Error('Vote cannot belong to both a Chapter and a Story'));
  } else {
    next();
  }
});

const Vote = mongoose.model('Vote', voteSchema);

export { Vote };
