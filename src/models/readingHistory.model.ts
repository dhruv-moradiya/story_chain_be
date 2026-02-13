import mongoose, { Schema } from 'mongoose';
import {
  IReadingHistoryDoc,
  IChapterReadDoc,
} from '@features/readingHistory/types/readingHistory.types';

const chapterReadSchema = new Schema<IChapterReadDoc>(
  {
    chapterSlug: {
      type: String,
      ref: 'Chapter',
      required: true,
    },

    // Time tracking
    totalReadTime: {
      type: Number, // seconds
      default: 0,
    },

    lastHeartbeatAt: {
      type: Date,
      default: null,
    },

    // Multi-tab protection
    activeSessionId: {
      type: String,
      default: null,
    },

    // Unique reader flag
    hasQualifiedRead: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
      default: null,
    },

    // Path taken
    chaptersRead: [chapterReadSchema],

    // Statistics
    lastReadAt: {
      type: Date,
      default: Date.now,
    },

    totalStoryReadTime: {
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
    timestamps: false,
  }
);

// Unique: one history per user per story
readingHistorySchema.index({ userId: 1, storySlug: 1 }, { unique: true });
readingHistorySchema.index({ userId: 1, lastReadAt: -1 });

const ReadingHistory = mongoose.model<IReadingHistoryDoc>('ReadingHistory', readingHistorySchema);
const ChapterRead = mongoose.model<IChapterReadDoc>('ChapterRead', chapterReadSchema);

export { ReadingHistory, ChapterRead };
