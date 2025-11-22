import { PipelineStage } from 'mongoose';

class StoryPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  lastSevenDaysStories() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.pipeline.push({
      $match: {
        createdAt: { $gte: sevenDaysAgo, $lt: new Date() },
      },
    });
    return this;
  }
  build() {
    return this.pipeline;
  }
}

export { StoryPipelineBuilder };
