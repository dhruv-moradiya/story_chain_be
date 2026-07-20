import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { GalleryImageRepository } from '../repositories/galleryImage.repository';
import { IGalleryImage } from '../types/galleryImage.types';
import { AppError } from '@/infrastructure/errors/app-error';
import {
  TGalleryImageBulkCreateSchema,
  TGalleryImageQuerySchema,
  TGalleryImageUpdateSchema,
} from '@/schema/request/galleryImage.schema';
import { deleteCloudinaryAsset } from '@/utils/cloudinary';
import { StoryQueryService } from '@/features/story/services/story-query.service';

@singleton()
export class GalleryImageService {
  constructor(
    @inject(TOKENS.GalleryImageRepository)
    private readonly galleryImageRepository: GalleryImageRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService
  ) {}

  async addImagesToGallery(
    storySlug: string,
    userId: string,
    data: TGalleryImageBulkCreateSchema
  ): Promise<IGalleryImage[]> {
    // Validate story exists
    await this.storyQueryService.getBySlug(storySlug);

    const imagesToCreate = data.images.map((img) => ({
      ...img,
      storySlug,
      uploadedBy: userId,
    }));

    return this.galleryImageRepository.bulkCreate(imagesToCreate);
  }

  async getGalleryByStory(
    storySlug: string,
    query: TGalleryImageQuerySchema
  ): Promise<IGalleryImage[]> {
    // Validate story exists
    await this.storyQueryService.getBySlug(storySlug);

    return this.galleryImageRepository.findByStorySlug(storySlug, query);
  }

  async updateImageMetadata(
    imageId: string,
    data: TGalleryImageUpdateSchema
  ): Promise<IGalleryImage> {
    const image = await this.galleryImageRepository.findById({ id: imageId });
    if (!image) {
      throw AppError.notFound('NOT_FOUND', 'Gallery image not found');
    }

    const updated = await this.galleryImageRepository.findOneAndUpdate({
      filter: { _id: imageId },
      update: data,
    });
    return updated as IGalleryImage;
  }

  async removeImage(imageId: string): Promise<void> {
    const image = await this.galleryImageRepository.findById({ id: imageId });
    if (!image) {
      throw AppError.notFound('NOT_FOUND', 'Gallery image not found');
    }

    // Delete from Cloudinary
    try {
      await deleteCloudinaryAsset(image.publicId);
    } catch (error) {
      // Log error but continue with DB deletion
      console.error(`Failed to delete Cloudinary asset ${image.publicId}:`, error);
    }

    // Delete from DB
    await this.galleryImageRepository.findOneAndDelete({ filter: { _id: imageId } });
  }
}
