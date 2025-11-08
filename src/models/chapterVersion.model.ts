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
    changesSummary: String,
    prId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
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
