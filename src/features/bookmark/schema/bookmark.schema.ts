import { z } from 'zod';

export const createBookmarkSchema = z.object({
  storySlug: z.string().min(1, 'Story Slug is required'),
  chapterSlug: z.string().min(1, 'Chapter Slug is required'),
  note: z.string().optional(),
});

export const getBookmarksQuerySchema = z.object({
  query: z.string().optional(),
  order: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const deleteBookmarkSchema = z.object({
  params: z.object({
    bookmarkId: z.string().min(1, 'Bookmark ID is required'),
  }),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type TGetBookmarksQueryInput = z.infer<typeof getBookmarksQuerySchema>;
export type DeleteBookmarkInput = z.infer<typeof deleteBookmarkSchema>;
