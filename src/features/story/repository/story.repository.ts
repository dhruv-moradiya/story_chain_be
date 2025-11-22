import { Story } from '../../../models/story.model';
import { BaseRepository } from '../../../utils';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { IStory, IStoryDoc } from '../story.types';

export class StoryRepository extends BaseRepository<IStory, IStoryDoc> {
  constructor() {
    super(Story);
  }

  async countStoriesCreatedToday(userId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return this.model.countDocuments({
      creatorId: userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
  }

  async getNewStories(): Promise<IStory[]> {
    const pipeline = new StoryPipelineBuilder().lastSevenDaysStories().build();

    return this.model.aggregate(pipeline).exec();
  }

  async findAll(): Promise<IStory[]> {
    return this.model.find().lean();
  }
}
