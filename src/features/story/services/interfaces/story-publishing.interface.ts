import { IStory } from '../../types/story.types';

interface IStoryPublishingService {
  publish(slug: string, userId: string): Promise<IStory>;
  unpublish(slug: string, userId: string): Promise<IStory>;
}

export type { IStoryPublishingService };
