import mongoose, { Schema } from 'mongoose';
import { IBookmarkDoc } from '@features/bookmark/types/bookmark.types';

const bookmarkSchema = new Schema<IBookmarkDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    chapterSlug: {
      type: String,
      required: true,
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
bookmarkSchema.index({ userId: 1, chapterSlug: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, storySlug: 1 });

const Bookmark = mongoose.model<IBookmarkDoc>('Bookmark', bookmarkSchema);

export { Bookmark };
