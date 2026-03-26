import { z } from 'zod';
import { ObjectIdSchema } from '@/utils/index';

const CastCommentVoteSchema = z.object({
  commentId: ObjectIdSchema(),
  voteType: z.enum(['upvote', 'downvote'], { message: 'Invalid vote type' }),
});

type TCastCommentVoteSchema = z.infer<typeof CastCommentVoteSchema>;

const RemoveCommentVoteSchema = z.object({
  commentId: ObjectIdSchema(),
});

type TRemoveCommentVoteSchema = z.infer<typeof RemoveCommentVoteSchema>;

export { CastCommentVoteSchema, RemoveCommentVoteSchema };
export type { TCastCommentVoteSchema, TRemoveCommentVoteSchema };
