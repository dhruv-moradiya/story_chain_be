import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrCommentService } from '../services/prComment.service';
import { catchAsync } from '@/utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '@/utils/apiResponse';
import { TAddPRCommentSchema } from '@/schema/request/pr-comment.schema';
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
      const userId = request.user.clerkId;
      const pullRequestId = request.params.pullRequestId;
      const body = request.body;

      const input = { ...body, userId, pullRequestId };

      await this.prCommentService.addPrComment(input);

      return reply.code(201).send(ApiResponse.created({}, ''));
    }
  );
}
