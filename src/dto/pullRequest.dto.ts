import { TPRLabel } from '@/features/pullRequest/types/pullRequest.types';
import { TCreatePullRequestSchema } from '@schema/request/pullRequest.schema';

type IPullRequestDto = TCreatePullRequestSchema & {
  userId: string;
};

interface IUserPullRequestDTO {
  userId: string;
}

interface IUpdatePRLableDTO {
  prId: string;
  labels: TPRLabel[];
}

export type { IPullRequestDto, IUserPullRequestDTO, IUpdatePRLableDTO };
