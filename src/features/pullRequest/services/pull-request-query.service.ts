import { IUserPullRequestDTO } from '@/dto/pullRequest.dto';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { TOKENS } from '@/container';

@singleton()
class PullRequestQueryService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
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
