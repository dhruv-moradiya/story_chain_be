import { injectable } from 'tsyringe';
import { StoryRepository } from '@/features/story/repositories/story.repository';
import { IOperationOptions } from '@/types';

@injectable()
export class StoryGuardService {
  constructor(private readonly storyRepo: StoryRepository) {}

  async ensureStoryExistsBySlug(slug: string, options: IOperationOptions = {}) {
    const story = await this.storyRepo.findBySlug(slug, options);

    if (!story) {
      throw new Error('Story not found');
    }

    return story;
  }

  async ensureStoryExistsById(storyId: string, options: IOperationOptions = {}) {
    const story = await this.storyRepo.findById(storyId, {}, options);

    if (!story) {
      throw new Error('Story not found');
    }
    return story;
  }
}
