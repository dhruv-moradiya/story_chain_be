import mongoose, { Schema } from 'mongoose';
import { IReadingHistoryDoc } from '../features/readingHistory/readingHistory.types';

const readingHistorySchema = new Schema<IReadingHistoryDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },

    // Current position
    currentChapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },

    // Path taken
    chaptersRead: [
      {
        chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    // Statistics
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    totalReadTime: {
      type: Number,
      default: 0,
    },
    completedPaths: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one history per user per story
readingHistorySchema.index({ userId: 1, storyId: 1 }, { unique: true });
readingHistorySchema.index({ userId: 1, lastReadAt: -1 });

const ReadingHistory = mongoose.model('ReadingHistory', readingHistorySchema);

export { ReadingHistory };
