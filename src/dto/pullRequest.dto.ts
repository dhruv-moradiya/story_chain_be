import { TCreatePullRequestSchema } from '@schema/request/pullRequest.schema';

type IPullRequestDto = TCreatePullRequestSchema & {
  userId: string;
};

export type { IPullRequestDto };
