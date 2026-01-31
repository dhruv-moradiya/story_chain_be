import { IStoryUpdateCardImageBySlugDTO, IStoryUpdateCoverImageBySlugDTO } from '@/dto/story.dto';
import { IStory } from '../../types/story.types';

interface IStoryMediaService {
  addOrUpdateCoverImage(input: IStoryUpdateCoverImageBySlugDTO): Promise<IStory['coverImage']>;
  addOrUpdateCardImage(input: IStoryUpdateCardImageBySlugDTO): Promise<IStory['cardImage']>;
  getImageUploadParams(slug: string, userId: string): Promise<{ uploadURL: string }>;
}

export type { IStoryMediaService };
