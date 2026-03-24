import { z } from 'zod';
import { ObjectIdSchema } from '@/utils/index';

const CastCommentVoteSchema = z.object({
  commentId: ObjectIdSchema(),
  voteType: z.enum(['upvote', 'downvote'], { message: 'Invalid vote type' }),
});

type TCastCommentVoteSchema = z.infer<typeof CastCommentVoteSchema>;

export { CastCommentVoteSchema };
export type { TCastCommentVoteSchema };
