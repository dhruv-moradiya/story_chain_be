import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { AuthMiddlewareFactory, StoryRoleMiddlewareFactory } from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import { GalleryImageResponses } from '@/schema/response/galleryImage.response';
import {
  GalleryImageCreateSchema,
  GalleryImageBulkCreateSchema,
  GalleryImageQuerySchema,
  GalleryImageUpdateSchema,
} from '@/schema/request/galleryImage.schema';
import { StorySlugSchema } from '@/schema/request/story.schema';
import { GalleryImageController } from '../controllers/galleryImage.controller';
import { RateLimits } from '@/constants/rateLimits';

const GalleryImageApiRoutes = {
  GenerateSignature: '/slug/:slug/signature',
  AddImage: '/slug/:slug',
  BulkUploadImages: '/slug/:slug/bulk',
  GetGallery: '/slug/:slug',
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

  // 1. Generate signature URL for Cloudinary upload (collaborators only)
  fastify.post(
    GalleryImageApiRoutes.GenerateSignature,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Generate signature URL for Cloudinary gallery image upload',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        response: GalleryImageResponses.signatureGenerated,
      },
    },
    galleryImageController.generateSignature
  );

  // 2. Add single image to gallery (collaborators only)
  fastify.post(
    GalleryImageApiRoutes.AddImage,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Add an image to a story gallery',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(GalleryImageCreateSchema),
        response: GalleryImageResponses.imageAdded,
      },
    },
    galleryImageController.addImage
  );

  // 3. Upload multiple images in bulk (collaborators only)
  fastify.post(
    GalleryImageApiRoutes.BulkUploadImages,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Upload multiple images in bulk to a story gallery',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        body: zodToJsonSchema(GalleryImageBulkCreateSchema),
        response: GalleryImageResponses.imagesUploaded,
      },
    },
    galleryImageController.uploadImages
  );

  // 4. Get all gallery images for a story (collaborators only)
  fastify.get(
    GalleryImageApiRoutes.GetGallery,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.isCollaborator],
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all gallery images for a story',
        tags: ['Gallery Images'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugSchema),
        querystring: zodToJsonSchema(GalleryImageQuerySchema),
        response: GalleryImageResponses.imageList,
      },
    },
    galleryImageController.getGallery
  );

  // 5. Update a gallery image (collaborators only)
  fastify.patch(
    GalleryImageApiRoutes.UpdateImage,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Update gallery image metadata (isMoodboard, chapterSlug, albumId, title, caption, category, sortOrder)',
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

  // 6. Delete a gallery image (collaborators only)
  fastify.delete(
    GalleryImageApiRoutes.DeleteImage,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Delete a gallery image from Cloudinary and database',
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
