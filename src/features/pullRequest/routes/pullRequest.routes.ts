import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import {
  CreatePullRequestSchema,
  UpdatePRLabelsSchema,
  UpdatePRParamsSchema,
} from '@schema/request/pullRequest.schema';
import { PullRequestController } from '../controllers/pullRequest.controller';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const PullRequestApiRoutes = {
  Create: '/',

  UserPRs: '/my',

  UpdateLabels: '/:id/labels',
} as const;

export async function pullRequestRoutes(fastify: FastifyInstance) {
  const pullRequestController = container.resolve<PullRequestController>(
    TOKENS.PullRequestController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    PullRequestApiRoutes.Create,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description: 'Create a new pull request for a story chapter',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CreatePullRequestSchema),
      },
    },
    pullRequestController.createPullRequest
  );

  fastify.get(
    PullRequestApiRoutes.UserPRs,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description: 'Get pull requests for a story chapter',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
      },
    },
    pullRequestController.getUserPullRequests
  );

  fastify.patch(
    PullRequestApiRoutes.UpdateLabels,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description: 'Update pull request labels',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(UpdatePRParamsSchema),
        body: zodToJsonSchema(UpdatePRLabelsSchema),
      },
    },
    pullRequestController.updatePRLabels
  );
}
