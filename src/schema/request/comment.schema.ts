import { z } from 'zod';

const CommentIdSchema = z.object({
  commentId: z.string(),
});

const CommentCreateSchema = z.object({
  chapterSlug: z.string(),
  content: z.string(),
  parentCommentId: z.string().optional(),
});

const CommentUpdateSchema = z.object({
  content: z.string(),
});

const CommentByChapterSchema = z.object({
  chapterSlug: z.string(),
  limit: z.coerce.number().optional().default(10),
  cursor: z.string().optional(),
  parentCommentId: z.string().optional(),
});

export type TCommentIdSchema = z.infer<typeof CommentIdSchema>;
export type TCommentCreateSchema = z.infer<typeof CommentCreateSchema>;
export type TCommentUpdateSchema = z.infer<typeof CommentUpdateSchema>;
export type TCommentByChapterSchema = z.infer<typeof CommentByChapterSchema>;

export { CommentIdSchema, CommentCreateSchema, CommentUpdateSchema, CommentByChapterSchema };
