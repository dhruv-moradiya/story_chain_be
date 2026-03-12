import { TOKENS } from '@/container';
import { ICreatePrCommentDTO, IEditPrCommentDTO, IResolvePrCommentDTO } from '@/dto/pr-comment.dto';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { ID } from '@/types';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrCommentRepository } from '../repositories/pr-comment-repository';
import { PRCommentType } from '../types/prComment-enum';
import { IPRComment } from '../types/prComment.types';

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

  async getPrCommentById(commentId: string): Promise<IPRComment> {
    const prComment = await this.prCommentRepository.getCommentById(commentId);

    if (!prComment) {
      this.throwNotFoundError(
        'PR_COMMENT_NOT_FOUND',
        `The PR comment with id ${commentId} does not exist or may have been removed.`
      );
    }

    return prComment;
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

    const shouldSetResolved =
      input.commentType === PRCommentType.SUGGESTION ||
      input.commentType === PRCommentType.REQUEST_CHANGES ||
      input.commentType === PRCommentType.QUESTION;

    const commentInput = {
      ...input,
      ...(shouldSetResolved && { isResolved: false }),
    };

    const prComment = await this.prCommentRepository.create({ data: commentInput });

    if (!prComment) {
      this.throwBadRequest(
        'INTERNAL_SERVER_ERROR',
        'Failed to create PR comment. Please try again later.'
      );
    }

    return prComment;
  }

  async editPrComment(input: IEditPrCommentDTO) {
    const prComment = await this.prCommentRepository.editComment(input);

    if (!prComment) {
      this.throwBadRequest(
        'INTERNAL_SERVER_ERROR',
        'Failed to update PR comment. Please try again later.'
      );
    }

    return prComment;
  }

  async resolvePrComment(input: IResolvePrCommentDTO) {
    const prComment = await this.prCommentRepository.resolveComment(input);

    if (!prComment) {
      this.throwBadRequest(
        'INTERNAL_SERVER_ERROR',
        'Failed to resolve PR comment. Please try again later.'
      );
    }

    return prComment;
  }

  async getPrComments(pullRequestId: string) {
    return await this.prCommentRepository.find({ filter: { pullRequestId } });
  }
}

export { PrCommentService };
