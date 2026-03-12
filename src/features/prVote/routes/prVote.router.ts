import { TOKENS } from '@/container';
import { RateLimits } from '@/constants/rateLimits';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { PullRequestIdSchema } from '@/schema/request/pullRequest.schema';
import { CastPRVoteSchema } from '@/schema/request/pr-vote.schema';
import { FastifyInstance } from 'fastify';
import type {} from '@fastify/rate-limit';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { PrVoteController } from '../controllers/prVote.controller';

const PRVoteApiRoute = {
  cast: '/:pullRequestId/votes',
  remove: '/:pullRequestId/votes',
  summary: '/:pullRequestId/votes',
  myVote: '/:pullRequestId/votes/me',
} as const;

export async function prVoteRoutes(fastify: FastifyInstance) {
  const prVoteController = container.resolve<PrVoteController>(TOKENS.PrVoteController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    PRVoteApiRoute.cast,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Create or update the authenticated user vote for a pull request.',
        tags: ['Pull Request Votes'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
        body: zodToJsonSchema(CastPRVoteSchema),
      },
    },
    prVoteController.castVote
  );

  fastify.delete(
    PRVoteApiRoute.remove,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Remove the authenticated user vote from a pull request.',
        tags: ['Pull Request Votes'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    prVoteController.removeVote
  );

  fastify.get(
    PRVoteApiRoute.summary,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get vote summary for a pull request.',
        tags: ['Pull Request Votes'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    prVoteController.getVoteSummary
  );

  fastify.get(
    PRVoteApiRoute.myVote,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get the authenticated user vote for a pull request.',
        tags: ['Pull Request Votes'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PullRequestIdSchema),
      },
    },
    prVoteController.getUserVote
  );
}
