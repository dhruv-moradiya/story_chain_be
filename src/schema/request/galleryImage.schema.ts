import { z } from 'zod';
import { GALLERY_IMAGE_CATEGORIES } from '@features/galleryImage/types/galleryImage-enum';

/**
 * Single Image Creation Schema
 * Supports: url, publicId, title, caption, category, isMoodboard
 */
export const GalleryImageCreateSchema = z.object({
  url: z.string().url('Invalid image URL format'),
  publicId: z.string().min(1, 'Public ID is required'),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  category: z.enum(GALLERY_IMAGE_CATEGORIES).optional().default('other'),
  isMoodboard: z.boolean().optional().default(false),
});

export type TGalleryImageCreateSchema = z.infer<typeof GalleryImageCreateSchema>;

/**
 * Bulk upload schema
 */
export const GalleryImageBulkCreateSchema = z.object({
  images: z.array(GalleryImageCreateSchema).min(1, 'At least one image is required'),
});

export type TGalleryImageBulkCreateSchema = z.infer<typeof GalleryImageBulkCreateSchema>;

/**
 * Update schema (at the time of updating user can set isMoodboard, chapterSlug, albumId, etc.)
 */
export const GalleryImageUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  category: z.enum(GALLERY_IMAGE_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  chapterSlug: z.string().optional().nullable(),
  albumId: z.string().optional().nullable(),
  isMoodboard: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type TGalleryImageUpdateSchema = z.infer<typeof GalleryImageUpdateSchema>;

/**
 * Query params schema
 */
export const GalleryImageQuerySchema = z.object({
  category: z.enum(GALLERY_IMAGE_CATEGORIES).optional(),
  isMoodboard: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  chapterSlug: z.string().optional(),
  albumId: z.string().optional(),
});

export type TGalleryImageQuerySchema = z.infer<typeof GalleryImageQuerySchema>;
