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

  async upsert(data: IRecordHeartBeatDTO): Promise<IReadingHistory> {
    const { userId, storySlug, chapterSlug, duration } = data;

    const pipeline = new ReadingHistoryPipelineBuilder()
      .upsertHeartBeat(chapterSlug, duration)
      .build();

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
