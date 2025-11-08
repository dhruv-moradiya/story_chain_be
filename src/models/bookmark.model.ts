import mongoose, { Schema } from 'mongoose';
import { IBookmarkDoc } from '../features/bookmark/bookmark.types';

const bookmarkSchema = new Schema<IBookmarkDoc>(
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
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
    },
    note: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one bookmark per user per story
bookmarkSchema.index({ userId: 1, storyId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

export { Bookmark };
