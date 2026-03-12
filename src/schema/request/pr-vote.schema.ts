import { z } from 'zod';

const CastPRVoteSchema = z.object({
  vote: z.union([z.literal(1), z.literal(-1)]),
});

type TCastPRVoteSchema = z.infer<typeof CastPRVoteSchema>;

export { CastPRVoteSchema };

export type { TCastPRVoteSchema };
