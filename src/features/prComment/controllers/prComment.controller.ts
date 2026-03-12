import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrCommentService } from '../services/prComment.service';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '@/utils/apiResponse';
import { TAddPRCommentSchema, TEditPRCommentSchema } from '@/schema/request/pr-comment.schema';
import { TPullRequestIdSchema } from '@/schema/request/pullRequest.schema';

@singleton()
export class PrCommentController extends BaseModule {
  constructor(
    @inject(TOKENS.PrCommentService) private readonly prCommentService: PrCommentService
  ) {
    super();
  }

  addComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TAddPRCommentSchema; Params: TPullRequestIdSchema }>,
      reply: FastifyReply
    ) => {
      const body = request.body;
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;

      const input = { ...body, userId, pullRequestId };

      await this.prCommentService.addPrComment(input);

      return reply.code(201).send(ApiResponse.created({}, ''));
    }
  );

  editComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TEditPRCommentSchema; Params: { commentId: string } }>,
      reply: FastifyReply
    ) => {
      const body = request.body;
      const userId = request.user.clerkId;
      const commentId = request.params.commentId;

      const input = { ...body, userId, commentId };

      await this.prCommentService.editPrComment(input);

      return reply.code(200).send(ApiResponse.updated(null, 'Comment edited successfully'));
    }
  );

  resolveComment = catchAsync(
    async (
      request: FastifyRequest<{ Body: TEditPRCommentSchema; Params: { commentId: string } }>,
      reply: FastifyReply
    ) => {
      const body = request.body;
      const userId = request.user.clerkId;
      const commentId = request.params.commentId;

      const input = { ...body, userId, commentId };

      await this.prCommentService.resolvePrComment(input);

      return reply.code(200).send(ApiResponse.updated(null, 'Comment resolved successfully'));
    }
  );

  getPrComments = catchAsync(
    async (request: FastifyRequest<{ Params: TPullRequestIdSchema }>, reply: FastifyReply) => {
      const pullRequestId = request.params.pullRequestId;

      const prComments = await this.prCommentService.getPrComments(pullRequestId);

      return reply
        .code(200)
        .send(ApiResponse.success(prComments, 'OK', 'PR comments fetched successfully'));
    }
  );
}
