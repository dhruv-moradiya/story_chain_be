import mongoose, { Schema } from 'mongoose';
import { IGalleryImageDoc } from '@features/galleryImage/types/galleryImage.types';
import { GALLERY_CATEGORIES } from '@features/galleryImage/types/galleryImage-enum';

const galleryImageSchema = new Schema<IGalleryImageDoc>(
  {
    storySlug: { type: String, required: true, ref: 'Story', index: true },
    uploadedBy: { type: String, required: true, ref: 'User' },

    // The asset
    url: { type: String, required: true },
    publicId: { type: String, required: true },

    // Metadata
    title: { type: String, maxlength: 200 },
    caption: { type: String, maxlength: 500 },
    category: { type: String, enum: GALLERY_CATEGORIES, default: 'other', index: true },
    tags: { type: [String], default: [] },

    // Context links
    chapterSlug: { type: String },
    albumId: { type: Schema.Types.ObjectId, ref: 'Album' },

    // Flags
    isMoodboard: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
galleryImageSchema.index({ storySlug: 1, category: 1, createdAt: -1 }); // tab filters
galleryImageSchema.index({ storySlug: 1, albumId: 1 }); // album view
galleryImageSchema.index({ storySlug: 1, isMoodboard: 1 }); // moodboard strip
galleryImageSchema.index({ storySlug: 1, chapterSlug: 1 }); // chapter tag filter

const GalleryImage = mongoose.model<IGalleryImageDoc>('GalleryImage', galleryImageSchema);

export { GalleryImage };
