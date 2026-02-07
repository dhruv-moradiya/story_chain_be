import { logger } from '@/utils/logger';
import { PipelineStage } from 'mongoose';

class ReadingHistoryPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  upsertHeartBeat(chapterSlug: string, duration: number) {
    this.pipeline.push(
      {
        $set: {
          chaptersRead: {
            $cond: [
              { $in: [chapterSlug, { $ifNull: ['$chaptersRead.chapterSlug', []] }] },
              '$chaptersRead',
              {
                $concatArrays: [
                  { $ifNull: ['$chaptersRead', []] },
                  [
                    {
                      chapterSlug,
                      readAt: new Date(),
                    },
                  ],
                ],
              },
            ],
          },
        },
      },
      {
        $set: {
          currentChapterSlug: chapterSlug,
          lastReadAt: new Date(),
          totalReadTime: {
            $add: [{ $ifNull: ['$totalReadTime', 0] }, duration],
          },
        },
      }
    );
    return this;
  }

  build() {
    return this.pipeline;
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

export { ReadingHistoryPipelineBuilder };
