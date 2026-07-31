import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import {
  AuthMiddlewareFactory,
  PlatformRoleMiddlewareFactory,
  StoryRoleMiddlewareFactory,
} from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import { ReportController } from '../controllers/report.controller';
import {
  BanUserFromStorySchema,
  CreateReportSchema,
  PaginatedReportQueryParamsSchema,
  PlatformBanUserSchema,
  PlatformResolveReportSchema,
  ReportIdParamsSchema,
  ResolveStoryReportSchema,
  StoryReportParamsSchema,
  StorySlugParamsSchema,
  StoryUserBanParamsSchema,
  UpdateReportStatusSchema,
  UserIdParamsSchema,
} from '@/schema/request/report.schema';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const ReportRoutes = {
  // User endpoints
  Create: '/',
  MyReports: '/my-reports',
  MyReportById: '/:reportId',

  // Story-level moderation endpoints
  StoryReports: '/stories/:storySlug/reports',
  ResolveStoryReport: '/stories/:storySlug/reports/:reportId/resolve',
  BanUserFromStory: '/stories/:storySlug/bans',
  UnbanUserFromStory: '/stories/:storySlug/bans/:userId',

  // Platform-level moderation endpoints
  AdminReports: '/admin/reports',
  AdminReportById: '/admin/reports/:reportId',
  AdminUpdateReportStatus: '/admin/reports/:reportId/status',
  AdminResolveReport: '/admin/reports/:reportId/resolve',
  AdminBanUser: '/admin/users/:userId/ban',
} as const;

export async function reportRoutes(fastify: FastifyInstance) {
  const reportController = container.resolve<ReportController>(TOKENS.ReportController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  const platformRoleFactory = container.resolve<PlatformRoleMiddlewareFactory>(
    TOKENS.PlatformRoleMiddlewareFactory
  );
  const platformGuards = platformRoleFactory.createGuards();

  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // ═══════════════════════════════════════════
  // USER ENDPOINTS
  // ═══════════════════════════════════════════

  fastify.post(
    ReportRoutes.Create,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Submit a new content or user report',
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CreateReportSchema),
      },
    },
    reportController.createReport
  );

  fastify.get(
    ReportRoutes.MyReports,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get paginated list of reports submitted by logged-in user',
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(PaginatedReportQueryParamsSchema),
      },
    },
    reportController.getMyReports
  );

  fastify.get(
    ReportRoutes.MyReportById,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get details of a report filed by logged-in user',
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ReportIdParamsSchema),
      },
    },
    reportController.getMyReportById
  );

  // ═══════════════════════════════════════════
  // STORY-LEVEL MODERATION ENDPOINTS
  // ═══════════════════════════════════════════

  fastify.get(
    ReportRoutes.StoryReports,
    {
      preHandler: [validateAuth, loadStoryContext], // , StoryRoleGuards.canModerateStory
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'List all reports filed within a specific story',
        tags: ['Story Moderation'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugParamsSchema),
        querystring: zodToJsonSchema(PaginatedReportQueryParamsSchema),
      },
    },
    reportController.getStoryReports
  );

  fastify.patch(
    ReportRoutes.ResolveStoryReport,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canModerateStory],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Resolve or dismiss a story-level report',
        tags: ['Story Moderation'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryReportParamsSchema),
        body: zodToJsonSchema(ResolveStoryReportSchema),
      },
    },
    reportController.resolveStoryReport
  );

  fastify.post(
    ReportRoutes.BanUserFromStory,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canModerateStory],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Ban a user from participating in a specific story',
        tags: ['Story Moderation'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugParamsSchema),
        body: zodToJsonSchema(BanUserFromStorySchema),
      },
    },
    reportController.banUserFromStory
  );

  fastify.delete(
    ReportRoutes.UnbanUserFromStory,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canManageStoryBans],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Remove a story-level user ban',
        tags: ['Story Moderation'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StoryUserBanParamsSchema),
      },
    },
    reportController.unbanUserFromStory
  );

  // ═══════════════════════════════════════════
  // PLATFORM-LEVEL MODERATION ENDPOINTS
  // ═══════════════════════════════════════════

  fastify.get(
    ReportRoutes.AdminReports,
    {
      preHandler: [validateAuth, platformGuards.canViewReports],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get all platform-wide reports for admin/moderator queue',
        tags: ['Platform Admin - Reports'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(PaginatedReportQueryParamsSchema),
      },
    },
    reportController.getAdminReports
  );

  fastify.get(
    ReportRoutes.AdminReportById,
    {
      preHandler: [validateAuth, platformGuards.canViewReports],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get detailed platform report payload',
        tags: ['Platform Admin - Reports'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ReportIdParamsSchema),
      },
    },
    reportController.getAdminReportById
  );

  fastify.patch(
    ReportRoutes.AdminUpdateReportStatus,
    {
      preHandler: [validateAuth, platformGuards.canViewReports],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update platform report status (REVIEWED / DISMISSED)',
        tags: ['Platform Admin - Reports'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ReportIdParamsSchema),
        body: zodToJsonSchema(UpdateReportStatusSchema),
      },
    },
    reportController.updateReportStatus
  );

  fastify.post(
    ReportRoutes.AdminResolveReport,
    {
      preHandler: [validateAuth, platformGuards.canViewReports],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Resolve a platform report with global resolution notes',
        tags: ['Platform Admin - Reports'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ReportIdParamsSchema),
        body: zodToJsonSchema(PlatformResolveReportSchema),
      },
    },
    reportController.resolveAdminReport
  );

  fastify.post(
    ReportRoutes.AdminBanUser,
    {
      preHandler: [validateAuth, platformGuards.canBan],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Issue a global platform ban for a user',
        tags: ['Platform Admin - Moderation'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(UserIdParamsSchema),
        body: zodToJsonSchema(PlatformBanUserSchema),
      },
    },
    reportController.banUserGlobally
  );
}
