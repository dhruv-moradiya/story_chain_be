import { RateLimits } from '@/constants/rateLimits';
import { TOKENS } from '@/container';
import type { AuthMiddlewareFactory } from '@/middlewares/factories';
import { DistributeCoinsSchema } from '@/schema/request/storyEarningsPool.schema';
import { StoryEarningsPoolResponses } from '@/schema/response/storyEarningsPool.response';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { StoryEarningsPoolController } from '../controllers/storyEarningsPool.controller';

export async function storyEarningsPoolRoutes(fastify: FastifyInstance) {
  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);

  const validateAuth = authFactory.createAuthMiddleware();

  const storyEarningsPoolController = container.resolve<StoryEarningsPoolController>(
    TOKENS.StoryEarningsPoolController
  );

  fastify.get(
    '/',
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get story earnings pool',
        tags: ['Story Earnings Pool'],
        security: [{ bearerAuth: [] }],
        response: StoryEarningsPoolResponses.storyEarningsPoolCreated,
      },
    },
    storyEarningsPoolController.getStoryEarningsPool
  );

  fastify.post(
    '/distribute-coins',
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Distribute coins',
        tags: ['Story Earnings Pool'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(DistributeCoinsSchema),
        response: StoryEarningsPoolResponses.distributeCoins,
      },
    },
    storyEarningsPoolController.distributeCoins
  );
}
