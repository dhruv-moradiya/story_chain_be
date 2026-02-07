import { logger } from '@/utils/logger';
import { PipelineStage } from 'mongoose';

class ReadingHistoryPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  upsertHeartBeat(chapterSlug: string, duration: number) {
    this.pipeline.push(
      // If chapter is alredy read than return "chapterRead" as it is,
      // If not than add new chapter to "chapterRead"
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
      // Update current chapter and last read at
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

  /**
   * Mark an ending chapter as completed.
   *
   * Logic:
   * - If chapterSlug is NOT in completedEndingChapters:
   *   1. Add chapterSlug to completedEndingChapters array
   *   2. Increment completedPaths by 1
   * - If chapterSlug IS already in completedEndingChapters:
   *   - Do nothing (user already completed this path)
   *
   * @param chapterSlug - The slug of the ending chapter
   */
  markEndingChapterCompleted(chapterSlug: string) {
    this.pipeline.push({
      $set: {
        // Check if this ending chapter was already completed
        _isNewCompletion: {
          $not: {
            $in: [chapterSlug, { $ifNull: ['$completedEndingChapters', []] }],
          },
        },
      },
    });

    this.pipeline.push({
      $set: {
        // Add to completedEndingChapters if not already present
        completedEndingChapters: {
          $cond: [
            '$_isNewCompletion',
            {
              $concatArrays: [{ $ifNull: ['$completedEndingChapters', []] }, [chapterSlug]],
            },
            '$completedEndingChapters',
          ],
        },
        // Increment completedPaths only if this is a new completion
        completedPaths: {
          $cond: [
            '$_isNewCompletion',
            { $add: [{ $ifNull: ['$completedPaths', 0] }, 1] },
            '$completedPaths',
          ],
        },
      },
    });

    // Clean up temporary field
    this.pipeline.push({
      $unset: '_isNewCompletion',
    });

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
