import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { AuthMiddlewareFactory, StoryRoleMiddlewareFactory } from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import { GalleryImageResponses } from '@/schema/response/galleryImage.response';
import {
  GalleryImageBulkCreateSchema,
  GalleryImageQuerySchema,
  GalleryImageUpdateSchema,
} from '@/schema/request/galleryImage.schema';
import { StorySlugSchema } from '@/schema/request/story.schema';
import { GalleryImageController } from '../controllers/galleryImage.controller';
import { RateLimits } from '@/constants/rateLimits';

const GalleryImageApiRoutes = {
  GetGallery: '/slug/:slug',
  UploadImages: '/slug/:slug',
  UpdateImage: '/:imageId',
  DeleteImage: '/:imageId',
} as const;

export async function galleryImageRoutes(fastify: FastifyInstance) {
  const galleryImageController = container.resolve<GalleryImageController>(
    TOKENS.GalleryImageController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // Get all gallery images for a story
  fastify.get(
    GalleryImageApiRoutes.GetGallery,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all gallery images for a story',
        tags: ['Gallery Images'],
        params: zodToJsonSchema(StorySlugSchema),
        querystring: zodToJsonSchema(GalleryImageQuerySchema),
        response: GalleryImageResponses.imageList,
      },
    },
    galleryImageController.getGallery
  );

  // Upload multiple images to a story's gallery
  fastify.post(
    GalleryImageApiRoutes.UploadImages,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Upload multiple images to a story gallery',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(GalleryImageBulkCreateSchema),
        response: GalleryImageResponses.imagesUploaded,
      },
    },
    galleryImageController.uploadImages
  );

  // Update a gallery image
  fastify.patch(
    GalleryImageApiRoutes.UpdateImage,
    {
      preHandler: [validateAuth], // Optionally verify ownership or role
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update gallery image metadata',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            imageId: { type: 'string' },
          },
          required: ['imageId'],
        },
        body: zodToJsonSchema(GalleryImageUpdateSchema),
        response: GalleryImageResponses.imageUpdated,
      },
    },
    galleryImageController.updateImage
  );

  // Delete a gallery image
  fastify.delete(
    GalleryImageApiRoutes.DeleteImage,
    {
      preHandler: [validateAuth], // Optionally verify ownership or role
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Delete a gallery image',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            imageId: { type: 'string' },
          },
          required: ['imageId'],
        },
        response: GalleryImageResponses.imageDeleted,
      },
    },
    galleryImageController.deleteImage
  );
}
