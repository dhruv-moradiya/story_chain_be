import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrCommentService } from '../services/prComment.service';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '@/utils/apiResponse';
import {
  TAddPRCommentSchema,
  TEditPRCommentSchema,
  TPRCommentParamsSchema,
} from '@/schema/request/pr-comment.schema';
import { TPullRequestIdSchema } from '@/schema/request/pullRequest.schema';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { StoryCollaboratorRules } from '@/domain/storyCollaborator.rules';
import {
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '@/features/storyCollaborator/types/storyCollaborator.types';

@singleton()
export class PrCommentController extends BaseModule {
  constructor(
    @inject(TOKENS.PrCommentService) private readonly prCommentService: PrCommentService,
    @inject(TOKENS.PullRequestQueryService)
    private readonly pullRequestQueryService: PullRequestQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  private hasStoryPermission(
    userStoryRole: TStoryCollaboratorRole | null,
    permission: TStoryCollaboratorPermission
  ) {
    return userStoryRole
      ? StoryCollaboratorRules.hasStoryPermission(userStoryRole, permission)
      : false;
  }

  private async getPRAccessContext(userId: string, pullRequestId: string) {
    const pullRequest = await this.pullRequestQueryService.getPullRequestById(pullRequestId);
    const userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
      userId,
      pullRequest.storySlug
    );

    return {
      pullRequest,
      userStoryRole,
    };
  }

  private ensureCommentBelongsToPullRequest(commentPullRequestId: unknown, pullRequestId: string) {
    if (String(commentPullRequestId) !== pullRequestId) {
      this.throwBadRequest(
        'INVALID_INPUT',
        'The specified comment does not belong to the provided pull request.'
      );
    }
  }

  private async ensureCanAccessPRComments(userId: string, pullRequestId: string) {
    const accessContext = await this.getPRAccessContext(userId, pullRequestId);
    const canReviewPRs = this.hasStoryPermission(accessContext.userStoryRole, 'canReviewPRs');
    const isPRAuthor = accessContext.pullRequest.authorId === userId;

    if (!canReviewPRs && !isPRAuthor) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have permission to access comments for this pull request.'
      );
    }

    return accessContext;
  }

  private async ensureCanEditPRComment(userId: string, pullRequestId: string, commentId: string) {
    await this.ensureCanAccessPRComments(userId, pullRequestId);
    const comment = await this.prCommentService.getPrCommentById(commentId);

    this.ensureCommentBelongsToPullRequest(comment.pullRequestId, pullRequestId);

    if (comment.userId !== userId) {
      this.throwForbiddenError('FORBIDDEN', 'You can only edit your own pull request comments.');
    }
  }

  private async ensureCanResolvePRComment(
    userId: string,
    pullRequestId: string,
    commentId: string
  ) {
    const accessContext = await this.ensureCanAccessPRComments(userId, pullRequestId);
    const comment = await this.prCommentService.getPrCommentById(commentId);

    this.ensureCommentBelongsToPullRequest(comment.pullRequestId, pullRequestId);

    const canModerateComments = this.hasStoryPermission(
      accessContext.userStoryRole,
      'canModerateComments'
    );
    const isPRAuthor = accessContext.pullRequest.authorId === userId;
    const isCommentAuthor = comment.userId === userId;

    if (!canModerateComments && !isPRAuthor && !isCommentAuthor) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'Only the pull request author, comment author, or story moderators can resolve this comment.'
      );
    }
  }

  addComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TAddPRCommentSchema; Params: TPullRequestIdSchema }>,
      reply: FastifyReply
    ) => {
      const body = request.body;
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      await this.ensureCanAccessPRComments(userId, pullRequestId);

      const input = { ...body, userId, pullRequestId };

      await this.prCommentService.addPrComment(input);

      return reply.code(201).send(ApiResponse.created({}, ''));
    }
  );

  editComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TEditPRCommentSchema; Params: TPRCommentParamsSchema }>,
      reply: FastifyReply
    ) => {
      const body = request.body;
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;
      const commentId = request.params.commentId;

      await this.ensureCanEditPRComment(userId, pullRequestId, commentId);

      const input = { ...body, userId, commentId };

      await this.prCommentService.editPrComment(input);

      return reply.code(200).send(ApiResponse.updated(null, 'Comment edited successfully'));
    }
  );

  resolveComment = catchAsync(
    async (request: FastifyRequest<{ Params: TPRCommentParamsSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;
      const commentId = request.params.commentId;

      await this.ensureCanResolvePRComment(userId, pullRequestId, commentId);

      const input = { userId, commentId };

      await this.prCommentService.resolvePrComment(input);

      return reply.code(200).send(ApiResponse.updated(null, 'Comment resolved successfully'));
    }
  );

  getPrComments = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      await this.ensureCanAccessPRComments(userId, pullRequestId);

      const prComments = await this.prCommentService.getPrComments(pullRequestId);

      return reply
        .code(200)
        .send(ApiResponse.success(prComments, 'OK', 'PR comments fetched successfully'));
    }
  );
}
