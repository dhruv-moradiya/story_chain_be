import { z } from 'zod';
import { GALLERY_CATEGORIES } from '@features/galleryImage/types/galleryImage-enum';

/**
 * Single Image Data
 */
export const GalleryImageBaseSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  category: z.enum(GALLERY_CATEGORIES).optional().default('other'),
  tags: z.array(z.string()).optional().default([]),
  chapterSlug: z.string().optional(),
  isMoodboard: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
});

/**
 * Bulk upload schema
 */
export const GalleryImageBulkCreateSchema = z.object({
  images: z.array(GalleryImageBaseSchema).min(1, 'At least one image is required'),
});

export type TGalleryImageBulkCreateSchema = z.infer<typeof GalleryImageBulkCreateSchema>;

/**
 * Update schema
 */
export const GalleryImageUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  category: z.enum(GALLERY_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  chapterSlug: z.string().optional(),
  isMoodboard: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type TGalleryImageUpdateSchema = z.infer<typeof GalleryImageUpdateSchema>;

/**
 * Query params schema
 */
export const GalleryImageQuerySchema = z.object({
  category: z.enum(GALLERY_CATEGORIES).optional(),
  isMoodboard: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  chapterSlug: z.string().optional(),
});

export type TGalleryImageQuerySchema = z.infer<typeof GalleryImageQuerySchema>;
