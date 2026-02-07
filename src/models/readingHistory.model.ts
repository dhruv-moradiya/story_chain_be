import mongoose, { Schema } from 'mongoose';
import { IReadingHistoryDoc } from '@features/readingHistory/types/readingHistory.types';

const readingHistorySchema = new Schema<IReadingHistoryDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    storySlug: {
      type: String,
      ref: 'Story',
      required: true,
      index: true,
    },

    // Current position
    currentChapterSlug: {
      type: String,
      ref: 'Chapter',
      required: true,
    },

    // Path taken
    chaptersRead: [
      {
        chapterSlug: { type: String, ref: 'Chapter' },
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

    completedEndingChapters: {
      type: [String],
      default: [],
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
readingHistorySchema.index({ userId: 1, storySlug: 1 }, { unique: true });
readingHistorySchema.index({ userId: 1, lastReadAt: -1 });

const ReadingHistory = mongoose.model<IReadingHistoryDoc>('ReadingHistory', readingHistorySchema);

export { ReadingHistory };
