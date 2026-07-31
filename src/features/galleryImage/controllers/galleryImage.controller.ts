import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { ApiResponse } from '@/utils/apiResponse';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { GalleryImageService } from '../services/galleryImage.service';
import {
  TGalleryImageCreateSchema,
  TGalleryImageBulkCreateSchema,
  TGalleryImageQuerySchema,
  TGalleryImageUpdateSchema,
} from '@/schema/request/galleryImage.schema';
import { TStorySlugSchema } from '@/schema/request/story.schema';

@singleton()
export class GalleryImageController extends BaseModule {
  constructor(
    @inject(TOKENS.GalleryImageService)
    private readonly galleryImageService: GalleryImageService
  ) {
    super();
  }

  generateSignature = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const result = await this.galleryImageService.generateUploadSignature(slug, userId);

      this.logInfo(`Generated Cloudinary signature for story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.ok(result, 'Cloudinary signature URL generated successfully'));
    }
  );

  addImage = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TGalleryImageCreateSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const newImage = await this.galleryImageService.addImageToGallery(slug, userId, request.body);

      this.logInfo(`Added gallery image to story ${slug} by user ${userId}`);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(newImage, 'Image added to gallery successfully'));
    }
  );

  uploadImages = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TGalleryImageBulkCreateSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const newImages = await this.galleryImageService.addImagesToGallery(
        slug,
        userId,
        request.body
      );

      this.logInfo(
        `Uploaded ${newImages.length} gallery images to story ${slug} by user ${userId}`
      );

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(newImages, 'Images uploaded successfully'));
    }
  );

  getGallery = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Querystring: TGalleryImageQuerySchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const images = await this.galleryImageService.getGalleryByStory(slug, userId, request.query);

      this.logInfo(`Fetched ${images.length} gallery images for story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(images, 'List of gallery images retrieved successfully'));
    }
  );

  updateImage = catchAsync(
    async (
      request: FastifyRequest<{ Params: { imageId: string }; Body: TGalleryImageUpdateSchema }>,
      reply: FastifyReply
    ) => {
      const { imageId } = request.params;
      const { clerkId: userId } = request.user;

      const updatedImage = await this.galleryImageService.updateImageMetadata(
        imageId,
        userId,
        request.body
      );

      this.logInfo(`Updated gallery image ${imageId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(updatedImage, 'Gallery image updated successfully'));
    }
  );

  deleteImage = catchAsync(
    async (request: FastifyRequest<{ Params: { imageId: string } }>, reply: FastifyReply) => {
      const { imageId } = request.params;
      const { clerkId: userId } = request.user;

      await this.galleryImageService.removeImage(imageId, userId);

      this.logInfo(`Deleted gallery image ${imageId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.deleted('Gallery image deleted successfully'));
    }
  );
}
