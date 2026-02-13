import { z } from 'zod';

export const createBookmarkSchema = z.object({
  storySlug: z.string().min(1, 'Story Slug is required'),
  chapterSlug: z.string().min(1, 'Chapter Slug is required'),
  note: z.string().optional(),
});

export const deleteBookmarkSchema = z.object({
  params: z.object({
    bookmarkId: z.string().min(1, 'Bookmark ID is required'),
  }),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type DeleteBookmarkInput = z.infer<typeof deleteBookmarkSchema>;
