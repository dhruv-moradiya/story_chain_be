import { z } from 'zod';
import { ObjectIdSchema } from '@/utils/index';

const CommentIdSchema = z.object({
  commentId: ObjectIdSchema(),
});

const CommentCreateSchema = z.object({
  chapterSlug: z.string(),
  content: z.string(),
  parentCommentId: ObjectIdSchema().optional(),
});

const CommentUpdateSchema = z.object({
  content: z.string(),
});

const CommentByChapterParamsSchema = z.object({
  chapterSlug: z.string(),
});

const CommentByChapterQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  page: z.coerce.number().optional().default(1),
  parentCommentId: ObjectIdSchema().optional(),
});

export type TCommentIdSchema = z.infer<typeof CommentIdSchema>;
export type TCommentCreateSchema = z.infer<typeof CommentCreateSchema>;
export type TCommentUpdateSchema = z.infer<typeof CommentUpdateSchema>;
export type TCommentByChapterParamsSchema = z.infer<typeof CommentByChapterParamsSchema>;
export type TCommentByChapterQuerySchema = z.infer<typeof CommentByChapterQuerySchema>;

export {
  CommentIdSchema,
  CommentCreateSchema,
  CommentUpdateSchema,
  CommentByChapterParamsSchema,
  CommentByChapterQuerySchema,
};
