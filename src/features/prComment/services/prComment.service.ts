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
    return await this.pullRequestService.existsPRById(_id);
  }

  private async _checkPRCommentExists(_id: ID) {
    return await this.prCommentRepository.existsCommentById(_id);
  }

  async addPrComment(input: ICreatePrCommentDTO) {
    const prExists = await this._checkPRExists(input.pullRequestId);

    if (!prExists) {
      this.throwNotFoundError(
        'PULL_REQUEST_NOT_FOUND',
        'The specified pull request does not exist or may have been removed.'
      );
    }

    if (input.parentCommentId) {
      const prCommentExists = await this._checkPRCommentExists(input.parentCommentId);
      if (!prCommentExists) {
        this.throwNotFoundError(
          'PR_COMMENT_NOT_FOUND',
          `The PR comment with id ${input.parentCommentId} does not exist or may have been removed.`
        );
      }
    }

    const prComment = await this.prCommentRepository.create({ data: input });

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
