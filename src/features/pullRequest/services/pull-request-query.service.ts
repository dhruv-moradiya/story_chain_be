import { IUserPullRequestDTO } from '@/dto/pullRequest.dto';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { TOKENS } from '@/container';
import { ID } from '@/types';
import { IPullRequest } from '../types/pullRequest.types';

@singleton()
class PullRequestQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
  }

  async existsPRById(_id: ID) {
    return await this.pullRequestRepository.existsById({ filter: { _id } });
  }

  async getPullRequestById(_id: ID): Promise<IPullRequest> {
    const pullRequest = await this.pullRequestRepository.findById({ id: _id });

    if (!pullRequest) {
      this.throwNotFoundError(
        'PULL_REQUEST_NOT_FOUND',
        'The requested pull request was not found. Please check the ID and try again.'
      );
    }

    return pullRequest;
  }

  getPullRequestsByStory() {}

  getPullRequestsByChapter() {}

  getPullRequestsByParentChapter() {}

  getPullRequestsByUser(input: IUserPullRequestDTO) {
    return this.pullRequestRepository.findUserPRs(input.userId);
  }
}

export { PullRequestQueryService };
