import { IStoryCreateDTO, IStoryUpdateSettingDTO, IUpdateStoryStatusDTO } from '@/dto/story.dto';
import { IStory } from '../../types/story.types';

interface IStoryCrudService {
  create(input: IStoryCreateDTO): Promise<IStory>;
  updateSettingsBySlug(input: IStoryUpdateSettingDTO): Promise<IStory>;
  updateStatus(input: IUpdateStoryStatusDTO): Promise<IStory>;
}

export type { IStoryCrudService };
