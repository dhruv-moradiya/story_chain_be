import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { TOKENS } from '@/container';
import { StoryRules } from '@/domain/story.rules';

import { IStoryPublishingService } from './interfaces/story-publishing.interface';
import { StoryRepository } from '../repositories/story.repository';
import { IStory } from '../types/story.types';

@singleton()
class StoryPublishingService extends BaseModule implements IStoryPublishingService {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository
  ) {
    super();
  }

  /**
   * Publish a story by slug
   */
  async publish(slug: string, userId: string): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    // Use enhanced domain validation
    const validation = StoryRules.validatePublishing(story, userId);

    if (!validation.canPublish) {
      this.throwBadRequest(`Cannot publish story: ${validation.errors.join(', ')}`);
    }

    const result = await this.storyRepo.changeStoryStatusToPublished(story._id);

    if (!result.modifiedCount) {
      this.throwInternalError('Unable to publish the story. Please try again.');
    }

    // Return the updated story
    const updatedStory = await this.storyRepo.findBySlug(slug);
    return updatedStory!;
  }

  /**
   * Unpublish a story by slug
   */
  async unpublish(slug: string, userId: string): Promise<IStory> {
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError('You do not have permission to unpublish this story.');
    }

    const updatedStory = await this.storyRepo.findOneAndUpdate(
      { slug },
      { status: 'draft', publishedAt: null },
      { new: true }
    );

    if (!updatedStory) {
      this.throwInternalError('Unable to unpublish the story. Please try again.');
    }

    return updatedStory;
  }
}

export { StoryPublishingService };
