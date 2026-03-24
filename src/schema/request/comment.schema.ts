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

const CommentByChapterSchema = z.object({
  chapterSlug: z.string(),
  limit: z.coerce.number().optional().default(10),
  cursor: ObjectIdSchema().optional(),
  parentCommentId: ObjectIdSchema().optional(),
});

export type TCommentIdSchema = z.infer<typeof CommentIdSchema>;
export type TCommentCreateSchema = z.infer<typeof CommentCreateSchema>;
export type TCommentUpdateSchema = z.infer<typeof CommentUpdateSchema>;
export type TCommentByChapterSchema = z.infer<typeof CommentByChapterSchema>;

export { CommentIdSchema, CommentCreateSchema, CommentUpdateSchema, CommentByChapterSchema };
