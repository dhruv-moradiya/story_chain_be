import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { TOKENS } from '@/container';
import { PullRequestPipelineBuilder } from '../pipelines/pullRequestPipeline.builder';
import { IDetailedPullRequest } from '../types/pullRequest.types';

@singleton()
export class PRQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
  }

  async getCurrentUserPullRequests(userId: string): Promise<IDetailedPullRequest[]> {
    const pipeline = new PullRequestPipelineBuilder().getCurrentUserPRsPreset(userId);

    const pullRequests =
      await this.pullRequestRepository.aggregatePullRequests<IDetailedPullRequest>(pipeline);

    return pullRequests;
  }
}
