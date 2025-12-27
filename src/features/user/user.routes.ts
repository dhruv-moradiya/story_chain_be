import { FastifyInstance } from 'fastify';
import { validateWebhook } from '../../middlewares/validateRequest';
import { userWebhookController } from './user.webhook.controller';
import { validateAuth } from '../../middlewares/authHandler';
import { userController } from './user.controller';
import zodToJsonSchema from 'zod-to-json-schema';
import {
  SearchUserByUsernameSchema,
  GetUserByIdSchema,
  GetUserByUsernameSchema,
  LoginUserSchema,
} from '../../schema/user.schema';
import { UserResponses } from '../../schema/response.schema';

// User API Routes - following chapterAutoSave pattern
const UserApiRoutes = {
  // Webhook
  Webhook: '/webhook',

  Login: '/login',

  // Current User
  GetMe: '/me',

  // User by ID
  GetById: '/id/:userId',

  // User by Username
  GetByUsername: '/username/:username',

  // Search
  Search: '/search',
} as const;

export { UserApiRoutes };

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post(
    UserApiRoutes.Login,
    {
      schema: {
        description: 'User login (for testing purposes)',
        tags: ['Users'],
        hide: true, // Hide from Swagger - internal endpoint
        body: zodToJsonSchema(LoginUserSchema),
        response: UserResponses.login,
      },
    },
    userController.login
  );

  // Clerk Webhook
  fastify.post(
    UserApiRoutes.Webhook,
    {
      preHandler: [validateWebhook],
      schema: {
        description: 'Clerk webhook handler for user events',
        tags: ['Users'],
        hide: true, // Hide from Swagger - internal endpoint
      },
    },
    userWebhookController.handle
  );

  // Get current authenticated user details
  fastify.get(
    UserApiRoutes.GetMe,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Get current authenticated user details',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        response: UserResponses.currentUser,
      },
    },
    userController.getCurrentUserDetails
  );

  // Get user by ID
  fastify.get(
    UserApiRoutes.GetById,
    {
      preHandler: [validateAuth],
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
}
