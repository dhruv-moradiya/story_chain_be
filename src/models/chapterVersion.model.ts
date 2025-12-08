import mongoose, { Schema } from 'mongoose';
import { IChapterVersionDoc } from '../features/chapterVersion/chapterVersion.types';

const chapterVersionSchema = new Schema<IChapterVersionDoc>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
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
      maxLength: 1000,
    },
    editType: {
      type: String,
      enum: ['MANUAL_EDIT', 'PR_MERGE', 'ADMIN_ROLLBACK', 'MODERATION_REMOVAL', 'IMPORT'],
      default: 'MANUAL_EDIT',
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
  },
  {
    timestamps: true,
  }
);

// Indexes
chapterVersionSchema.index({ chapterId: 1, version: -1 });

const ChapterVersion = mongoose.model('ChapterVersion', chapterVersionSchema);

export { ChapterVersion };
