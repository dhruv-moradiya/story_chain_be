import { Story } from '../../models/story.model';
import { BaseRepository } from '../../utils';
import { logger } from '../../utils/logger';
import { IStory, IStoryDoc } from './story.types';
import { CreateStoryInput } from './story.validation';

export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);
  }

  async updateStatistics(
    storyId: string,
    updates: Partial<IStory['stats']>
  ): Promise<IStory | null> {
    return this.findOneAndUpdate({ _id: storyId }, { $set: { stats: updates } });
  }
}

export class StoryService {
  /**
   * Creates a new story in the database.
   */
  async createStory(data: CreateStoryInput & { creatorId: string }) {
    try {
      const story = await Story.create(data);
      return story;
    } catch (error) {
      logger.error('Error creating story:', error);
      throw new Error('Something went wrong while creating your story. Please try again later.');
    }
  }

  /**
   * Fetches a story by its ID.
   */
  async getStoryById(storyId: string) {
    try {
      const story = await Story.findById(storyId);

      if (!story) {
        throw new Error('Story not found.');
      }

      return story;
    } catch (error) {
      logger.error('Error fetching story by ID:', error);
      throw new Error('Failed to fetch the story. Please try again later.');
    }
  }
}

export const storyService = new StoryService();
