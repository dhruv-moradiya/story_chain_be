import mongoose, { Schema } from 'mongoose';
import { IAlbumDoc } from '@features/album/types/album.types';
import { ALBUM_VISIBILITIES, GALLERY_CATEGORIES } from '@features/album/types/album-enum';
import { ImageAssetSchema } from '@/models/shared/imageAsset.schema';

const albumSchema = new Schema<IAlbumDoc>(
  {
    storySlug: { type: String, required: true, ref: 'Story', index: true },
    createdBy: { type: String, required: true, ref: 'User' },

    coverImage: ImageAssetSchema,
    title: { type: String, required: true, maxlength: 60 },
    description: { type: String, maxlength: 200 },
    category: { type: String, enum: GALLERY_CATEGORIES },
    tags: { type: [String], default: [] },
    visibility: { type: String, enum: ALBUM_VISIBILITIES, default: 'public' },
    sortOrder: { type: Number, default: 0 },

    /** Denormalized — increment when a GalleryImage is added to this album */
    imageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Indexes
albumSchema.index({ storySlug: 1, updatedAt: -1 }); // "Sort by: Recently Updated" default
albumSchema.index({ storySlug: 1, sortOrder: 1 });
albumSchema.index({ storySlug: 1, category: 1 });

const Album = mongoose.model<IAlbumDoc>('Album', albumSchema);

export { Album };
