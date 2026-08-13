import { StoryStatus } from '../../types/story-enum';
import { IStory } from '../../types/story.types';

interface IStoryPublishingService {
  publish(slug: string, userId: string): Promise<boolean>;
  unpublish(slug: string, userId: string): Promise<IStory>;
  changeStatus(slug: string, userId: string, targetStatus: StoryStatus | string): Promise<boolean>;
}

export type { IStoryPublishingService };
