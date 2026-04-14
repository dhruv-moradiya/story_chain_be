import { TOKENS } from '@/container';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { FastifyInstance } from 'fastify';
import { PRQueryController } from '../controllers/prQuery.controller';
import { container } from 'tsyringe';
import { PullRequestResponses } from '@/schema/response.schema';

const PullRequestRoutes = {
  GetCurrentUserPullRequests: '/me',
};

export async function prQueryRoutes(fastify: FastifyInstance) {
  const ctrl = container.resolve<PRQueryController>(TOKENS.PRQueryController);
  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    PullRequestRoutes.GetCurrentUserPullRequests,
    {
      preHandler: [validateAuth],
      schema: {
        description: "Get the current authenticated user's pull requests across all their stories.",
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        response: PullRequestResponses.pullRequestList,
      },
    },
    ctrl.getCurrentUserPullRequests
  );
}
