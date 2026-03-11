import { TOKENS } from '@/container';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { PrCommentController } from '../controllers/prComment.controller';
import zodToJsonSchema from 'zod-to-json-schema';
import { AddPrCommentSchema, EditPrCommentSchema } from '@/schema/request/pr-comment.schema';
import { RateLimits } from '@/constants/rateLimits';
import { PullRequestIdSchema } from '@/schema/request/pullRequest.schema';

const PRCommentApiRoute = {
  add: '/:pullRequestId/comments',
  edit: '/:pullRequestId/comments/:commentId',
  resolve: '/:pullRequestId/comments/:commentId/resolve',
  list: '/:pullRequestId/comments',
} as const;

export async function prCommentroutes(fastify: FastifyInstance) {
  const PrCommentController = container.resolve<PrCommentController>(TOKENS.PrCommentController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    PRCommentApiRoute.add,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Create a new comment on a pull request, including replies and code suggestions.',
        tags: ['Pull Request Comments'],
        params: zodToJsonSchema(PullRequestIdSchema),
        body: zodToJsonSchema(AddPrCommentSchema),
      },
    },
    PrCommentController.addComment
  );

  fastify.put(
    PRCommentApiRoute.edit,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Edit a comment on a pull request.',
        tags: ['Pull Request Comments'],
        params: zodToJsonSchema(PullRequestIdSchema),
        body: zodToJsonSchema(EditPrCommentSchema),
      },
    },
    PrCommentController.editComment
  );

  fastify.patch(
    PRCommentApiRoute.resolve,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Resolve a comment on a pull request.',
        tags: ['Pull Request Comments'],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    PrCommentController.resolveComment
  );

  fastify.get(
    PRCommentApiRoute.list,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all comments for a pull request.',
        tags: ['Pull Request Comments'],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    PrCommentController.getPrComments
  );
}
