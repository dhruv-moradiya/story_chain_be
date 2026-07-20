import { HTTP_STATUS } from '@/constants/httpStatus';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { ApiResponse } from '@/utils/apiResponse';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { GalleryImageService } from '../services/galleryImage.service';
import {
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

      const images = await this.galleryImageService.getGalleryByStory(slug, request.query);

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

      const updatedImage = await this.galleryImageService.updateImageMetadata(
        imageId,
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

      await this.galleryImageService.removeImage(imageId);

      this.logInfo(`Deleted gallery image ${imageId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.deleted('Gallery image deleted successfully'));
    }
  );
}
