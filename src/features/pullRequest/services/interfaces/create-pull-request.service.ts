import { IPullRequestDto } from '@dto/pullRequest.dto';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';

interface ICreatePullRequestService {
  create(input: IPullRequestDto): Promise<IPullRequest>;
}

export type { ICreatePullRequestService };
