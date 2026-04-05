import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { TOKENS } from '@/container';

@singleton()
export class PRQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
  }

  async getCurrentUserPullRequests(userId: string) {
    const pullRequests = await this.pullRequestRepository.findCurrentUserPullRequests(userId);

    return pullRequests;
  }
}
