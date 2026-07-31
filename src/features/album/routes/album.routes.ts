import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { AuthMiddlewareFactory, StoryRoleMiddlewareFactory } from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import { AlbumResponses } from '@/schema/response/album.response';
import {
  AlbumCreateSchema,
  AlbumAddImagesSchema,
  AlbumUpdateSchema,
  AlbumQuerySchema,
} from '@/schema/request/album.schema';
import { StorySlugSchema } from '@/schema/request/story.schema';
import { AlbumController } from '../controllers/album.controller';
import { RateLimits } from '@/constants/rateLimits';

const AlbumApiRoutes = {
  CreateAlbum: '/slug/:slug',
  AddImagesToAlbum: '/:albumId/images',
  GetAlbumsByStory: '/slug/:slug',
  GetAlbumById: '/:albumId',
  UpdateAlbum: '/:albumId',
  DeleteAlbum: '/:albumId',
} as const;

export async function albumRoutes(fastify: FastifyInstance) {
  const albumController = container.resolve<AlbumController>(TOKENS.AlbumController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // 1. Create a new album for a story (collaborators only)
  fastify.post(
    AlbumApiRoutes.CreateAlbum,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Create a new album for a story',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(AlbumCreateSchema),
        response: AlbumResponses.albumCreated,
      },
    },
    albumController.createAlbum
  );

  // 2. Add images to an album (collaborators only)
  fastify.post(
    AlbumApiRoutes.AddImagesToAlbum,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Add existing gallery images to an album',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            albumId: { type: 'string' },
          },
          required: ['albumId'],
        },
        body: zodToJsonSchema(AlbumAddImagesSchema),
        response: AlbumResponses.imagesAddedToAlbum,
      },
    },
    albumController.addImagesToAlbum
  );

  // 3. Get all albums for a story (collaborators only)
  fastify.get(
    AlbumApiRoutes.GetAlbumsByStory,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all albums for a story',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        querystring: zodToJsonSchema(AlbumQuerySchema),
        response: AlbumResponses.albumList,
      },
    },
    albumController.getAlbumsByStory
  );

  // 4. Get single album details and its associated images
  fastify.get(
    AlbumApiRoutes.GetAlbumById,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get album details with associated gallery images',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            albumId: { type: 'string' },
          },
          required: ['albumId'],
        },
        response: AlbumResponses.albumDetails,
      },
    },
    albumController.getAlbumById
  );

  // 5. Update an album (collaborators only)
  fastify.patch(
    AlbumApiRoutes.UpdateAlbum,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update album title, description, visibility, or sort order',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            albumId: { type: 'string' },
          },
          required: ['albumId'],
        },
        body: zodToJsonSchema(AlbumUpdateSchema),
        response: AlbumResponses.albumUpdated,
      },
    },
    albumController.updateAlbum
  );

  // 6. Delete an album (collaborators only)
  fastify.delete(
    AlbumApiRoutes.DeleteAlbum,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Delete an album and unassign its gallery images',
        tags: ['Albums'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            albumId: { type: 'string' },
          },
          required: ['albumId'],
        },
        response: AlbumResponses.albumDeleted,
      },
    },
    albumController.deleteAlbum
  );
}
