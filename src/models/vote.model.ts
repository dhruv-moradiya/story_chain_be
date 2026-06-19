import mongoose, { Schema } from 'mongoose';
import { IVoteDoc } from '@features/vote/types/vote.types';

const voteSchema = new Schema<IVoteDoc>(
  {
    chapterSlug: {
      type: String,
      index: true,
    },
    storySlug: {
      type: String,
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
  { chapterSlug: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { chapterSlug: { $exists: true } },
  }
);

// Ensure one vote per user per story
voteSchema.index(
  { storySlug: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { storySlug: { $exists: true } },
  }
);

// Validation to ensure either chapterSlug or storySlug is present, but not both
voteSchema.pre('validate', function (next) {
  if (!this.chapterSlug && !this.storySlug) {
    next(new Error('Vote must belong to either a Chapter or a Story'));
  } else if (this.chapterSlug && this.storySlug) {
    next(new Error('Vote cannot belong to both a Chapter and a Story'));
  } else {
    next();
  }
});

const Vote = mongoose.model('Vote', voteSchema);

export { Vote };
