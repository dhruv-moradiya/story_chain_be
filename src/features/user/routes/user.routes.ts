import { RateLimits } from '@/constants/rateLimits';
import { TOKENS } from '@/container';
import { PlatformRoleMiddlewareFactory, type AuthMiddlewareFactory } from '@/middlewares/factories';
import { ClerkUserIdParamsSchema } from '@/schema/request/commonRequest.schema';
import type {} from '@fastify/rate-limit';
import { validateWebhook } from '@middleware/validateRequest';
import {
  BanUserSchema,
  GetUserByIdSchema,
  GetUserByUsernameSchema,
  GetUsersListQuerySchema,
  SearchUserByUsernameSchema,
} from '@schema/request/user.schema';
import { UserResponses } from '@schema/response.schema';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { type UserController } from '../controllers/user.controller';
import { type UserWebhookController } from '../controllers/user.webhook.controller';

// User API Routes - following chapterAutoSave pattern
const UserApiRoutes = {
  // Webhook
  Webhook: '/webhook',

  // Current User
  GetMe: '/me',

  // User List (Paginated)
  List: '/list',

  // User by ID
  GetById: '/id/:userId',

  // User by Username
  GetByUsername: '/username/:username',

  // Search
  Search: '/search',

  BanUser: '/ban',
  UnbanUser: '/unban',
} as const;

export { UserApiRoutes };

export async function userRoutes(fastify: FastifyInstance) {
  const userController = container.resolve<UserController>(TOKENS.UserController);
  const userWebhookController = container.resolve<UserWebhookController>(
    TOKENS.UserWebhookController
  );
  const platformRoleFactory = container.resolve<PlatformRoleMiddlewareFactory>(
    TOKENS.PlatformRoleMiddlewareFactory
  );

  const authMiddlewareFactory = container.resolve<AuthMiddlewareFactory>(
    TOKENS.AuthMiddlewareFactory
  );
  const validateAuth = authMiddlewareFactory.createAuthMiddleware();
  const PlatformRoleGuards = platformRoleFactory.createGuards();

  // Clerk Webhook
  fastify.post(
    UserApiRoutes.Webhook,
    {
      preHandler: [validateWebhook],
      config: { rateLimit: RateLimits.WEBHOOK },
      schema: {
        description: 'Clerk webhook handler for user events',
        tags: ['Users'],
        hide: true,
      },
    },
    userWebhookController.handle
  );

  // Get current authenticated user details
  fastify.get(
    UserApiRoutes.GetMe,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Get current authenticated user details',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        response: UserResponses.currentUser,
      },
    },
    userController.getCurrentUserDetails
  );

  // Get paginated list of users
  fastify.get(
    UserApiRoutes.List,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get paginated list of users with full details',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(GetUsersListQuerySchema),
        response: UserResponses.paginatedUserList,
      },
    },
    userController.getUsersList
  );

  // Get user by ID
  fastify.get(
    UserApiRoutes.GetById,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get user by their ID',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(GetUserByIdSchema),
        response: UserResponses.userProfile,
      },
    },
    userController.getUserById
  );

  // Get user by username
  fastify.get(
    UserApiRoutes.GetByUsername,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get user by their username',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(GetUserByUsernameSchema),
        response: UserResponses.userProfile,
      },
    },
    userController.getUserByUsername
  );

  // Search users by username
  fastify.post(
    UserApiRoutes.Search,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.AUTHENTICATED },
      schema: {
        description: 'Search users by username',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(SearchUserByUsernameSchema),
        response: UserResponses.userList,
      },
    },
    userController.searchUserByUsername
  );

  fastify.post(
    UserApiRoutes.BanUser,
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Ban a user',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(ClerkUserIdParamsSchema),
        body: zodToJsonSchema(BanUserSchema),
        // response: UserResponses.userProfile,
      },
    },
    userController.banUser
  );
}
