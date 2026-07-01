import { TOKENS } from '@/container';
import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { StoryRepository } from '../repositories/story.repository';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { attachUserStages } from '@/shared/pipelines';
import { IExploreStory } from '@/types/response/story.response.types';

@singleton()
export class ExploreStoriesService extends BaseModule {
  constructor(@inject(TOKENS.StoryRepository) private storyRepo: StoryRepository) {
    super();
  }

  async getFreshStories() {
    const pipeline = new StoryPipelineBuilder()
      .addStages(
        attachUserStages({
          as: 'creator',
          localField: 'creatorId',
          preserveNullAndEmpty: true,
          project: { username: 1, _id: 0, clerkId: 1 },
        })
      )
      .getFreshStories()
      .build();

    const result = await this.storyRepo.aggregateStories<IExploreStory>(pipeline);

    return result;
  }
}
