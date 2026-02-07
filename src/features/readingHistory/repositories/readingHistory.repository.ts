import { IRecordHeartBeatDTO } from '@/dto/readingHistory.dto';
import { ReadingHistory } from '@/models/readingHistory.model';
import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { ReadingHistoryPipelineBuilder } from '../pipelines/readingHistoryPipeline.builder';
import { IReadingHistory, IReadingHistoryDoc } from '../types/readingHistory.types';

@singleton()
class ReadingHistoryRepository extends BaseRepository<IReadingHistory, IReadingHistoryDoc> {
  constructor() {
    super(ReadingHistory);
  }

  /**
   * Upsert reading history with heartbeat data
   * @param data - The heartbeat data (userId, storySlug, chapterSlug, duration)
   * @param isEnding - Whether the chapter is an ending chapter (determined by service)
   */
  async upsert(data: IRecordHeartBeatDTO, isEnding: boolean = false): Promise<IReadingHistory> {
    const { userId, storySlug, chapterSlug, duration } = data;

    const pipelineBuilder = new ReadingHistoryPipelineBuilder().upsertHeartBeat(
      chapterSlug,
      duration
    );

    // If this chapter is an ending chapter, mark it as completed
    // This will only increment completedPaths if user hasn't completed this ending before
    if (isEnding) {
      pipelineBuilder.markEndingChapterCompleted(chapterSlug);
    }

    const pipeline = pipelineBuilder.build();

    const readingHistory = this.model.findOneAndUpdate({ userId, storySlug }, pipeline, {
      upsert: true,
      new: true,
    });

    return readingHistory;
  }

  // async markAsCompleted(data: IMarkAsCompletedDTO): Promise<IReadingHistory> {
  //   const { userId, storySlug, chapterSlug } = data;

  //   // const readingHistory = this.model.findOneAndUpdate(
  //   //     { userId, storySlug },
  //   //     { $set: { currentChapterSlug: chapterSlug, lastReadAt: new Date() } },
  //   //     { upsert: true, new: true }
  //   // );

  //   // return readingHistory
  // }

  // async getReadingHistory(userId: string): Promise<IReadingHistory[]> {
  //   const readingHistory = this.model.find({ userId });

  //   return readingHistory;
  // }
}

export { ReadingHistoryRepository };
