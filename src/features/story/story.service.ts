import { IOperationOptions } from '../../types';
import { BaseModule } from '../../utils';
import { IStoryCreateDTO } from './dto/story.dto';
import { StoryRepository } from './repository/story.repository';
import { StoryRules } from './roles/story.roles';
import { IStory } from './story.types';

export class StoryService extends BaseModule {
  private readonly storyRepository = new StoryRepository();

  async createStory(
    input: IStoryCreateDTO & { creatorId: string },
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const todayCount = await this.storyRepository.countStoriesCreatedToday(input.creatorId);
    if (!StoryRules.canCreateStory(todayCount)) {
      this.throwTooManyRequestsError('Daily story creation limit reached. Try again tomorrow.');
    }

    const story = this.storyRepository.create(input, options);
    return story;
  }

  async getStoryById(storyId: string): Promise<IStory | null> {
    const story = await this.storyRepository.findById(storyId);
    return story;
  }

  async getStories(): Promise<IStory[]> {
    const stories = await this.storyRepository.findAll();
    return stories;
  }

  async getNewStories(): Promise<IStory[]> {
    const stories = await this.storyRepository.getNewStories();
    return stories;
  }
}

export const storyService = new StoryService();
