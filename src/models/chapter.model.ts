import {
  CHAPTER_PR_STATUSES,
  CHAPTER_STATUSES,
  ChapterStatus,
} from '@features/chapter/types/chapter-enum';
import { IChapterDoc } from '@features/chapter/types/chapter.types';
import mongoose, { Schema } from 'mongoose';

const chapterSchema = new Schema<IChapterDoc>(
  {
    storySlug: {
      type: String,
      required: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Tree structure
    parentChapterSlug: {
      type: String,
      default: null,
      index: true,
    },
    ancestorSlugs: {
      type: [String],
      default: [],
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
    },
    branchIndex: {
      type: Number,
      required: true,
      min: 1,
    },

    // Author
    authorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // Content
    content: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 10000,
    },
    title: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    chapterNumber: {
      type: Number,
      min: 1,
    },

    // Voting
    votes: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },

    // Status
    status: {
      type: String,
      enum: CHAPTER_STATUSES,
      default: ChapterStatus.PUBLISHED,
    },
    isEnding: {
      type: Boolean,
      default: false,
    },

    // Pull Request info
    pullRequest: {
      isPR: { type: Boolean, default: false },
      prId: { type: Schema.Types.ObjectId, ref: 'PullRequest' },
      status: {
        type: String,
        enum: CHAPTER_PR_STATUSES,
      },
      submittedAt: Date,
      reviewedBy: { type: String, ref: 'User' },
      reviewedAt: Date,
      rejectionReason: String,
    },

    // Version control
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChapterVersion',
    },

    // Statistics
    stats: {
      reads: { type: Number, default: 0 },
      uniqueReaders: { type: Number, default: 0 },

      completions: { type: Number, default: 0 },
      dropOffs: { type: Number, default: 0 },

      totalReadTime: { type: Number, default: 0 }, // sum of all users
      avgReadTime: { type: Number, default: 0 },

      completionRate: { type: Number, default: 0 }, // percentage
      engagementScore: { type: Number, default: 0 }, // 0-100 score

      comments: { type: Number, default: 0 },
      childBranches: { type: Number, default: 0 },
    },

    // Moderation
    reportCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chapterSchema.index({ storySlug: 1, parentChapterSlug: 1 });
chapterSchema.index({ storySlug: 1, ancestorSlugs: 1 });
chapterSchema.index({ authorId: 1, createdAt: -1 });
chapterSchema.index({ 'votes.score': -1 });
chapterSchema.index({ status: 1 });

const Chapter = mongoose.model<IChapterDoc>('Chapter', chapterSchema);

export { Chapter };
