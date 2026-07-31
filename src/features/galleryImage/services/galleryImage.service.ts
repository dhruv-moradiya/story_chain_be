import { inject, singleton } from 'tsyringe';
import { Types } from 'mongoose';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { env } from '@/config/env';
import { GalleryImageRepository } from '../repositories/galleryImage.repository';
import {
  IGalleryImage,
  IGalleryImageDoc,
  IGalleryImageSignatureResponse,
} from '../types/galleryImage.types';
import {
  TGalleryImageCreateSchema,
  TGalleryImageBulkCreateSchema,
  TGalleryImageQuerySchema,
  TGalleryImageUpdateSchema,
} from '@/schema/request/galleryImage.schema';
import { getGalleryImageUploadSignature, deleteCloudinaryAsset } from '@/utils/cloudinary';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { StoryTimelineService } from '@/features/story/services/story-timeline.service';

@singleton()
export class GalleryImageService extends BaseModule {
  constructor(
    @inject(TOKENS.GalleryImageRepository)
    private readonly galleryImageRepository: GalleryImageRepository,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.StoryTimelineService)
    private readonly storyTimelineService: StoryTimelineService
  ) {
    super();
  }

  /**
   * Helper: Ensure user is a collaborator (or creator) of the story
   */
  private async ensureCollaborator(storySlug: string, userId: string): Promise<void> {
    const role = await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug);
    if (!role) {
      this.throwForbiddenError('FORBIDDEN', 'Only story collaborators can perform this action.');
    }
  }

  /**
   * 1. Generate Cloudinary signature URL for uploading gallery image
   */
  async generateUploadSignature(
    storySlug: string,
    userId: string
  ): Promise<IGalleryImageSignatureResponse> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    const signatureQuery = getGalleryImageUploadSignature(storySlug);
    const uploadURL = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload${signatureQuery}`;

    return { uploadURL };
  }

  /**
   * 2a. Add a single image to gallery
   */
  async addImageToGallery(
    storySlug: string,
    userId: string,
    data: TGalleryImageCreateSchema
  ): Promise<IGalleryImage> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    const imageToCreate: Partial<IGalleryImageDoc> = {
      ...data,
      storySlug,
      uploadedBy: userId,
    };

    const newImage = await this.galleryImageRepository.createSingle(imageToCreate);

    await this.storyTimelineService.recordGalleryImageAdded(storySlug, userId, {
      imageId: newImage._id.toString(),
      publicId: newImage.publicId,
      title: newImage.title,
      isMoodboard: newImage.isMoodboard,
    });

    return newImage;
  }

  /**
   * 2b. Add multiple images to gallery in bulk
   */
  async addImagesToGallery(
    storySlug: string,
    userId: string,
    data: TGalleryImageBulkCreateSchema
  ): Promise<IGalleryImage[]> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    const imagesToCreate: Partial<IGalleryImageDoc>[] = data.images.map((img) => ({
      ...img,
      storySlug,
      uploadedBy: userId,
    }));

    const createdImages = await this.galleryImageRepository.bulkCreate(imagesToCreate);

    await this.storyTimelineService.recordGalleryImageAdded(storySlug, userId, {
      count: createdImages.length,
      imageIds: createdImages.map((img) => img._id.toString()),
    });

    return createdImages;
  }

  /**
   * 3. Fetch all images for a story with optional filtering
   */
  async getGalleryByStory(
    storySlug: string,
    userId: string,
    query: TGalleryImageQuerySchema
  ): Promise<IGalleryImage[]> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    return this.galleryImageRepository.findByStorySlug(storySlug, query);
  }

  /**
   * 4. Update gallery image details (title, caption, category, isMoodboard, chapterSlug, albumId, sortOrder)
   */
  async updateImageMetadata(
    imageId: string,
    userId: string,
    data: TGalleryImageUpdateSchema
  ): Promise<IGalleryImage> {
    const image = await this.galleryImageRepository.findById({ id: imageId });
    if (!image) {
      this.throwNotFoundError('NOT_FOUND', 'Gallery image not found');
    }

    await this.ensureCollaborator(image.storySlug, userId);

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.albumId !== undefined) {
      updatePayload.albumId = data.albumId ? new Types.ObjectId(data.albumId) : null;
    }

    const updated = await this.galleryImageRepository.findOneAndUpdate({
      filter: { _id: imageId },
      update: updatePayload,
      options: { new: true },
    });

    if (!updated) {
      this.throwNotFoundError('NOT_FOUND', 'Failed to update gallery image');
    }

    await this.storyTimelineService.recordGalleryImageUpdated(image.storySlug, userId, {
      imageId,
      updatedFields: Object.keys(data),
      isMoodboard: data.isMoodboard,
      chapterSlug: data.chapterSlug,
      albumId: data.albumId,
    });

    return updated as IGalleryImage;
  }

  /**
   * 5. Delete gallery image
   */
  async removeImage(imageId: string, userId: string): Promise<void> {
    const image = await this.galleryImageRepository.findById({ id: imageId });
    if (!image) {
      this.throwNotFoundError('NOT_FOUND', 'Gallery image not found');
    }

    await this.ensureCollaborator(image.storySlug, userId);

    // Delete from Cloudinary
    try {
      await deleteCloudinaryAsset(image.publicId);
    } catch (error) {
      this.logError(`Failed to delete Cloudinary asset ${image.publicId}`, error);
    }

    // Delete from DB
    await this.galleryImageRepository.findOneAndDelete({ filter: { _id: imageId } });

    await this.storyTimelineService.recordGalleryImageDeleted(image.storySlug, userId, {
      imageId,
      publicId: image.publicId,
    });
  }
}
