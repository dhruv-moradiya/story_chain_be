import { IUserPullRequestDTO } from '@/dto/pullRequest.dto';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { TOKENS } from '@/container';
import { ID } from '@/types';

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

  getPullRequestById() {}

  getPullRequestsByStory() {}

  getPullRequestsByChapter() {}

  getPullRequestsByParentChapter() {}

  getPullRequestsByUser(input: IUserPullRequestDTO) {
    return this.pullRequestRepository.findUserPRs(input.userId);
  }
}

export { PullRequestQueryService };
