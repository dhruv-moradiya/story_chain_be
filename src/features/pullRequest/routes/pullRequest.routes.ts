import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import { validateAuth } from '@middleware/authHandler';
import { CreatePullRequestSchema } from '@schema/request/pullRequest.schema';
import { PullRequestController } from '../controllers/pullRequest.controller';

const PullRequestApiRoutes = {
  Create: '/',
} as const;

export async function pullRequestRoutes(fastify: FastifyInstance) {
  const pullRequestController = container.resolve<PullRequestController>(
    TOKENS.PullRequestController
  );

  fastify.post(
    PullRequestApiRoutes.Create,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Create a new pull request for a story chapter',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CreatePullRequestSchema),
      },
    },
    pullRequestController.createPullRequest
  );
}
