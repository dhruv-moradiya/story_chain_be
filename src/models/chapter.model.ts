import {
  CHAPTER_PR_STATUSES,
  CHAPTER_STATUSES,
  ChapterStatus,
} from '@features/chapter/types/chapter-enum';
import { IChapterDoc } from '@features/chapter/types/chapter.types';
import mongoose, { Schema } from 'mongoose';

const chapterSchema = new Schema<IChapterDoc>(
  {
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },

    // Tree structure
    parentChapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      default: null,
      index: true,
    },
    ancestorIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Chapter',
      },
    ],
    depth: {
      type: Number,
      default: 0,
      min: 0,
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
chapterSchema.index({ storyId: 1, parentChapterId: 1 });
chapterSchema.index({ storyId: 1, depth: 1 });
chapterSchema.index({ authorId: 1, createdAt: -1 });
chapterSchema.index({ 'votes.score': -1 });
chapterSchema.index({ status: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

export { Chapter };
