import { TOKENS } from '@/container';
import { RateLimits } from '@/constants/rateLimits';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { PullRequestIdSchema } from '@/schema/request/pullRequest.schema';
import { SubmitPRReviewSchema } from '@/schema/request/pr-review.schema';
import { FastifyInstance } from 'fastify';
import type {} from '@fastify/rate-limit';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { PrReviewController } from '../controllers/prReview.controller';

const PRReviewApiRoutes = {
  submit: '/:pullRequestId/reviews',
  list: '/:pullRequestId/reviews',
  myReview: '/:pullRequestId/reviews/me',
} as const;

export async function prReviewRoutes(fastify: FastifyInstance) {
  const prReviewController = container.resolve<PrReviewController>(TOKENS.PrReviewController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    PRReviewApiRoutes.submit,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Create or update the authenticated user review for a pull request.',
        tags: ['Pull Request Reviews'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
        body: zodToJsonSchema(SubmitPRReviewSchema),
      },
    },
    prReviewController.submitReview
  );

  fastify.get(
    PRReviewApiRoutes.list,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all reviews for a pull request.',
        tags: ['Pull Request Reviews'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    prReviewController.getPRReviews
  );

  fastify.get(
    PRReviewApiRoutes.myReview,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get the authenticated user review for a pull request.',
        tags: ['Pull Request Reviews'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    prReviewController.getMyPRReview
  );
}
