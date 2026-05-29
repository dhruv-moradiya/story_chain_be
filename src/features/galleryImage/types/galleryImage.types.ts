import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { GALLERY_CATEGORIES, GalleryCategory } from './galleryImage-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TGalleryCategory = (typeof GALLERY_CATEGORIES)[number];

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IGalleryImage {
  _id: ID;
  storySlug: string;
  uploadedBy: string;

  // The asset
  url: string;
  publicId: string;

  // Metadata
  title?: string;
  caption?: string;
  category: TGalleryCategory;
  tags: string[];

  // Context links
  chapterSlug?: string;
  albumId?: ID;

  // Flags
  isMoodboard: boolean;
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IGalleryImageDoc extends Omit<IGalleryImage, '_id'>, Document {
  _id: Types.ObjectId;
  albumId?: Types.ObjectId;
}

export { GalleryCategory };
