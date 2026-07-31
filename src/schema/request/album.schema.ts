import { z } from 'zod';
import { ALBUM_VISIBILITIES } from '@features/album/types/album-enum';

/**
 * Schema for creating a new Album
 */
export const AlbumCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(60, 'Title cannot exceed 60 characters'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
  tags: z.array(z.string()).optional().default([]),
  visibility: z.enum(ALBUM_VISIBILITIES).optional().default('public'),
  sortOrder: z.number().optional().default(0),
});

export type TAlbumCreateSchema = z.infer<typeof AlbumCreateSchema>;

/**
 * Schema for adding images to an Album
 */
export const AlbumAddImagesSchema = z.object({
  imageIds: z
    .array(z.string().min(1, 'Invalid image ID'))
    .min(1, 'At least one image ID is required to add to album'),
});

export type TAlbumAddImagesSchema = z.infer<typeof AlbumAddImagesSchema>;

/**
 * Schema for updating Album details
 */
export const AlbumUpdateSchema = z.object({
  title: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(ALBUM_VISIBILITIES).optional(),
  sortOrder: z.number().optional(),
});

export type TAlbumUpdateSchema = z.infer<typeof AlbumUpdateSchema>;

/**
 * Query schema for listing Albums
 */
export const AlbumQuerySchema = z.object({
  visibility: z.enum(ALBUM_VISIBILITIES).optional(),
});

export type TAlbumQuerySchema = z.infer<typeof AlbumQuerySchema>;
