import mongoose, { Schema } from 'mongoose';
import { IVoteDoc } from '@features/vote/types/vote.types';

const voteSchema = new Schema<IVoteDoc>(
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

voteSchema.index({ chapterId: 1, userId: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

export { Vote };
