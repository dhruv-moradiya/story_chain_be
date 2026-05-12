import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { formatPaginatedResponse } from '@/utils/helpter';
import { inject, singleton } from 'tsyringe';
import { PullRequestPipelineBuilder } from '../pipelines/pullRequestPipeline.builder';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import {
  IPullRequestListItem,
  IPullRequestListResponse,
} from '../types/pull-request-response.types';

@singleton()
export class PRQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
  }

  async getCurrentUserPullRequests(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<IPullRequestListResponse> {
    const pipeline = new PullRequestPipelineBuilder().getCurrentUserPRsPreset(userId);

    const [pullRequests, totalCount] = await Promise.all([
      this.pullRequestRepository.aggregatePullRequests<IPullRequestListItem>(pipeline),
      this.pullRequestRepository.count({
        filter: {},
      }),
    ]);

    return formatPaginatedResponse(pullRequests, totalCount, page, limit);
  }
}
