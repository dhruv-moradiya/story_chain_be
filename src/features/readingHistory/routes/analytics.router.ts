import { container } from 'tsyringe';
import { AnalyticsController } from '../controllers/analytics.controller';
import { FastifyInstance } from 'fastify';
import { TOKENS } from '@/container';
import {
  type AuthMiddlewareFactory,
  type StoryRoleMiddlewareFactory,
} from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import zodToJsonSchema from 'zod-to-json-schema';
import {
  AnalyticsQuerySchema,
  ChapterAnalyticsParamSchema,
  StoryAnalyticsParamSchema,
} from '@/schema/request/analytics.schema';
import { AnalyticsResponses } from '@/schema/response/analytics.response';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const AnalyticsApiRoutes = {
  ChapterAnalytics: '/story/:storySlug/chapter/:chapterSlug/analytics',
  StoryAnalytics: '/story/:storySlug/analytics',
} as const;

export { AnalyticsApiRoutes };

export async function analyticsRoutes(fastify: FastifyInstance) {
  const analyticsController = container.resolve<AnalyticsController>(TOKENS.AnalyticsController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // GET /analytics/story/:storySlug/chapter/:chapterSlug/analytics?type=hourly
  fastify.get(
    AnalyticsApiRoutes.ChapterAnalytics,
    {
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get chapter-level reading analytics for charts',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ChapterAnalyticsParamSchema),
        querystring: zodToJsonSchema(AnalyticsQuerySchema),
        response: AnalyticsResponses.chapterAnalytics,
      },
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canViewStoryAnalytics],
    },
    analyticsController.getChapterAnalytics
  );

  // GET /analytics/story/:storySlug/analytics?type=hourly
  fastify.get(
    AnalyticsApiRoutes.StoryAnalytics,
    {
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get story-level reading analytics for charts',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryAnalyticsParamSchema),
        querystring: zodToJsonSchema(AnalyticsQuerySchema),
        // response: AnalyticsResponses.storyAnalytics,
      },
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canViewStoryAnalytics],
    },
    analyticsController.getStoryAnalytics
  );
}
