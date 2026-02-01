import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { TOKENS } from '@/container';
import { env } from '@/config/env';
import { StoryRules } from '@/domain/story.rules';

import { IStoryUpdateCardImageBySlugDTO, IStoryUpdateCoverImageBySlugDTO } from '@/dto/story.dto';
import { IStoryMediaService } from './interfaces/story-media.interface';
import { StoryRepository } from '../repositories/story.repository';
import { IStory } from '../types/story.types';

@singleton()
class StoryMediaService extends BaseModule implements IStoryMediaService {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository
  ) {
    super();
  }

  /**
   * Add or update card image for a story
   */
  async addOrUpdateCardImage(input: IStoryUpdateCardImageBySlugDTO): Promise<IStory['cardImage']> {
    const { slug, cardImage } = input;

    const story = await this.storyRepo.findOneAndUpdate({ slug }, { cardImage }, { new: true });

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to update card image.');
    }

    return story.cardImage;
  }

  /**
   * Add or update cover image for a story
   */
  async addOrUpdateCoverImage(
    input: IStoryUpdateCoverImageBySlugDTO
  ): Promise<IStory['coverImage']> {
    const { slug, coverImage } = input;

    const story = await this.storyRepo.findOneAndUpdate({ slug }, { coverImage }, { new: true });

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to update cover image.');
    }

    return story.coverImage;
  }

  /**
   * Get image upload params (Cloudinary signature URL)
   */
  async getImageUploadParams(slug: string, userId: string): Promise<{ uploadURL: string }> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError('You do not have permission to update this story.');
    }

    const { getSignatureURL } = await import('@/utils/cloudinary.js');
    const signatureURL = getSignatureURL(slug);

    return {
      uploadURL: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload${signatureURL}`,
    };
  }
}

export { StoryMediaService };
