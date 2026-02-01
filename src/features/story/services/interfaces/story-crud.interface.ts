import { IStoryCreateDTO, IStoryUpdateSettingDTO, IUpdateStoryStatusDTO } from '@/dto/story.dto';
import { IStory } from '../../types/story.types';

interface IStoryCrudService {
  create(input: IStoryCreateDTO): Promise<IStory>;
  updateSettings(input: IStoryUpdateSettingDTO): Promise<IStory>;
  updateSettingsBySlug(
    input: Omit<IStoryUpdateSettingDTO, 'storyId'> & { slug: string }
  ): Promise<IStory>;
  updateStatus(input: IUpdateStoryStatusDTO): Promise<IStory>;
}

export type { IStoryCrudService };
