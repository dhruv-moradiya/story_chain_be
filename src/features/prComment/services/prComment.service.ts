import { TOKENS } from '@/container';
import { ICreatePrCommentDTO } from '@/dto/pr-comment.dto';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { ID } from '@/types';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrCommentRepository } from '../repositories/pr-comment-repository';

@singleton()
class PrCommentService extends BaseModule {
  constructor(
    @inject(TOKENS.PrCommentRepository)
    private readonly prCommentRepository: PrCommentRepository,
    @inject(TOKENS.PullRequestQueryService)
    private readonly pullRequestService: PullRequestQueryService
  ) {
    super();
  }

  private async _checkPRExists(_id: ID) {
    console.log('_id', _id);
    return await this.pullRequestService.existsPRById(_id);
  }

  async addPrComment(input: ICreatePrCommentDTO) {
    console.log('input.pullRequestId', input.pullRequestId);
    const prExists = await this._checkPRExists(input.pullRequestId);
    console.log('prExists', prExists);

    if (!prExists) {
      this.throwNotFoundError(
        'PULL_REQUEST_NOT_FOUND',
        'The specified pull request does not exist or may have been removed.'
      );
    }

    const prComment = await this.prCommentRepository.create(input);

    if (!prComment) {
      this.throwBadRequest(
        'INTERNAL_SERVER_ERROR',
        'Failed to create PR comment. Please try again later.'
      );
    }

    return prComment;
  }
}

export { PrCommentService };
