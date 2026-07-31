import { inject, singleton } from 'tsyringe';
import { Types } from 'mongoose';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { AlbumRepository } from '../repositories/album.repository';
import { IAlbum } from '../types/album.types';
import {
  TAlbumCreateSchema,
  TAlbumAddImagesSchema,
  TAlbumUpdateSchema,
  TAlbumQuerySchema,
} from '@/schema/request/album.schema';
import { GalleryImageRepository } from '@/features/galleryImage/repositories/galleryImage.repository';
import { IGalleryImage } from '@/features/galleryImage/types/galleryImage.types';
import { StoryQueryService } from '@/features/story/services/story-query.service';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { StoryTimelineService } from '@/features/story/services/story-timeline.service';

@singleton()
export class AlbumService extends BaseModule {
  constructor(
    @inject(TOKENS.AlbumRepository)
    private readonly albumRepository: AlbumRepository,
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
   * 1. Create a new Album
   */
  async createAlbum(storySlug: string, userId: string, data: TAlbumCreateSchema): Promise<IAlbum> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    const album = await this.albumRepository.createSingle({
      ...data,
      storySlug,
      createdBy: userId,
      imageCount: 0,
    });

    await this.storyTimelineService.recordAlbumCreated(storySlug, userId, {
      albumId: album._id.toString(),
      title: album.title,
    });

    return album;
  }

  /**
   * 2. Add images to an Album
   */
  async addImagesToAlbum(
    albumId: string,
    userId: string,
    data: TAlbumAddImagesSchema
  ): Promise<IAlbum> {
    const album = await this.albumRepository.findById({ id: albumId });
    if (!album) {
      this.throwNotFoundError('NOT_FOUND', 'Album not found');
    }

    await this.ensureCollaborator(album.storySlug, userId);

    const albumObjectId = new Types.ObjectId(albumId);

    // Update matching gallery images to assign albumId
    await this.galleryImageRepository.updateMany(
      {
        _id: { $in: data.imageIds },
        storySlug: album.storySlug,
      },
      { albumId: albumObjectId }
    );

    // Calculate current total image count for this album
    const imagesInAlbum = await this.galleryImageRepository.findMany({
      filter: { albumId: albumId },
    });

    const updatedAlbum = await this.albumRepository.setImageCount(albumId, imagesInAlbum.length);

    await this.storyTimelineService.recordImagesAddedToAlbum(album.storySlug, userId, {
      albumId,
      addedCount: data.imageIds.length,
      totalImageCount: imagesInAlbum.length,
    });

    return (updatedAlbum || album) as IAlbum;
  }

  /**
   * 3. Fetch all albums for a story
   */
  async getAlbumsByStory(
    storySlug: string,
    userId: string,
    query: TAlbumQuerySchema
  ): Promise<IAlbum[]> {
    await this.storyQueryService.getBySlug(storySlug);
    await this.ensureCollaborator(storySlug, userId);

    return this.albumRepository.findByStorySlug(storySlug, query);
  }

  /**
   * 4. Get album details with associated images
   */
  async getAlbumById(
    albumId: string,
    userId: string
  ): Promise<IAlbum & { images: IGalleryImage[] }> {
    const album = await this.albumRepository.findById({ id: albumId });
    if (!album) {
      this.throwNotFoundError('NOT_FOUND', 'Album not found');
    }

    await this.ensureCollaborator(album.storySlug, userId);

    const images = await this.galleryImageRepository.findMany({
      filter: { albumId: albumId },
      options: { sort: { sortOrder: 1, createdAt: -1 } },
    });

    return {
      ...album,
      images,
    };
  }

  /**
   * 5. Update Album metadata
   */
  async updateAlbum(albumId: string, userId: string, data: TAlbumUpdateSchema): Promise<IAlbum> {
    const album = await this.albumRepository.findById({ id: albumId });
    if (!album) {
      this.throwNotFoundError('NOT_FOUND', 'Album not found');
    }

    await this.ensureCollaborator(album.storySlug, userId);

    const updated = await this.albumRepository.findOneAndUpdate({
      filter: { _id: albumId },
      update: data,
      options: { new: true },
    });

    if (!updated) {
      this.throwNotFoundError('NOT_FOUND', 'Failed to update album');
    }

    await this.storyTimelineService.recordAlbumUpdated(album.storySlug, userId, {
      albumId,
      updatedFields: Object.keys(data),
    });

    return updated as IAlbum;
  }

  /**
   * 6. Delete an Album
   */
  async deleteAlbum(albumId: string, userId: string): Promise<void> {
    const album = await this.albumRepository.findById({ id: albumId });
    if (!album) {
      this.throwNotFoundError('NOT_FOUND', 'Album not found');
    }

    await this.ensureCollaborator(album.storySlug, userId);

    // Unassign images from this album
    await this.galleryImageRepository.updateMany({ albumId: albumId }, { $unset: { albumId: '' } });

    // Delete album document
    await this.albumRepository.findOneAndDelete({ filter: { _id: albumId } });

    await this.storyTimelineService.recordAlbumDeleted(album.storySlug, userId, {
      albumId,
      title: album.title,
    });
  }
}
