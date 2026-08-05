import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import { AuthMiddlewareFactory } from '@/middlewares/factories';
import { StoryBanController } from '../controllers/storyBan.controller';
import { CheckStoryBanParamsSchema } from '@/schema/request/storyBan.schema';
import { RateLimits } from '@/constants/rateLimits';

export async function storyBanRoutes(fastify: FastifyInstance) {
  const storyBanController = container.resolve<StoryBanController>(TOKENS.StoryBanController);
  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    '/check/:storySlug/:userId',
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description:
          "Check if a user is banned from a specific story based on storySlug and user's ID",
        tags: ['Story Bans'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(CheckStoryBanParamsSchema),
      },
    },
    storyBanController.checkUserStoryBan
  );
}
