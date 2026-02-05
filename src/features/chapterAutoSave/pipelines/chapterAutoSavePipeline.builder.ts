import { logger } from '@/utils/logger';
import { PipelineStage } from 'mongoose';

class ChapterAutoSavePipelineBuilder {
  private pipeline: PipelineStage[] = [];

  sortByLastSavedAt() {
    this.pipeline.push({
      $sort: { lastSavedAt: -1 },
    });
    return this;
  }

  build() {
    return this.pipeline;
  }

  paginate(page: number, limit: number) {
    const skip = Math.max(page - 1, 0) * limit;
    this.pipeline.push({
      $skip: skip,
      $limit: limit,
    });
    return this;
  }

  when(condition: boolean, callback: (builder: this) => this) {
    return condition ? callback(this) : this;
  }

  addStage(stage: PipelineStage) {
    this.pipeline.push(stage);
    return this;
  }

  reset() {
    this.pipeline = [];
    return this;
  }

  debug() {
    logger.debug('Pipeline stages:', JSON.stringify(this.pipeline, null, 2));
    return this;
  }

  getPipeline() {
    return [...this.pipeline];
  }
}

export { ChapterAutoSavePipelineBuilder };
