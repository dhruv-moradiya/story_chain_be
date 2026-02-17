import mongoose, { Schema } from 'mongoose';
import { IChapterVersionDoc } from '@features/chapterVersion/types/chapterVersion.types';
import { CHAPTER_VERSION_EDIT_TYPES } from '@features/chapterVersion/types/chapterVersion-enum';

const chapterVersionSchema = new Schema<IChapterVersionDoc>(
  {
    chapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    title: String,
    editedBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    editReason: {
      type: String,
      maxlength: 500,
    },
    changesSummary: {
      type: String,
      maxlength: 1000,
    },
    editType: {
      type: String,
      enum: CHAPTER_VERSION_EDIT_TYPES,
      default: 'manual_edit',
      index: true,
    },
    prId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChapterVersion',
    },
    changeMetadata: {
      characterCountDelta: Number,
      wordCountDelta: Number,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    moderationInfo: {
      hiddenBy: {
        type: String,
        ref: 'User',
      },
      hiddenAt: Date,
      reasonHidden: {
        type: String,
        maxlength: 500,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chapterVersionSchema.index({ chapterSlug: 1, version: -1 });
chapterVersionSchema.index({ isVisible: 1 });

const ChapterVersion = mongoose.model('ChapterVersion', chapterVersionSchema);

export { ChapterVersion };
