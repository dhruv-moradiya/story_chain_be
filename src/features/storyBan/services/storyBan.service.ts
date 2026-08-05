import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { StoryBanRepository } from '../repositories/storyBan.repository';
import { IStoryBanStatusResponse } from '@/types/response/storyBan.response.types';

@singleton()
export class StoryBanService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryBanRepository)
    private readonly storyBanRepository: StoryBanRepository
  ) {
    super();
  }

  async checkUserBanFromStory(storySlug: string, userId: string): Promise<IStoryBanStatusResponse> {
    return this.storyBanRepository.checkUserBanWithPipeline(storySlug, userId);
  }
}
