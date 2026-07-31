import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  ALBUM_VISIBILITIES,
  GALLERY_IMAGE_CATEGORIES,
  AlbumVisibility,
  GalleryCategory,
} from './album-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TAlbumVisibility = (typeof ALBUM_VISIBILITIES)[number];
export type TAlbumCategory = (typeof GALLERY_IMAGE_CATEGORIES)[number];

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface IAlbum {
  _id: ID;
  storySlug: string;
  createdBy: string;

  title: string;
  description?: string;
  tags: string[];
  visibility: TAlbumVisibility;
  sortOrder: number;

  /** Denormalized count — incremented when a GalleryImage is added to this album */
  imageCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IAlbumDoc extends Omit<IAlbum, '_id'>, Document {
  _id: Types.ObjectId;
}

export { AlbumVisibility, GalleryCategory };
