import { TOKENS } from '@/container';
import { IRecordHeartBeatDTO } from '@/dto/readingHistory.dto';
import { IReadingHistoryResponse } from '@/types/response/readingHistory.types';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ReadingHistoryRepository } from '../repositories/readingHistory.repository';
import { IReadingHistoryService } from './interfaces';

@singleton()
class ReadingHistoryService extends BaseModule implements IReadingHistoryService {
  constructor(
    @inject(TOKENS.ReadingHistoryRepository)
    private readonly readingHistoryRepository: ReadingHistoryRepository
  ) {
    super();
  }

  async upsert(input: IRecordHeartBeatDTO): Promise<IReadingHistoryResponse> {
    const readingHistory = await this.readingHistoryRepository.upsert(input);

    return {
      totalReadTime: readingHistory.totalReadTime,
      currentChapterSlug: readingHistory.currentChapterSlug,
      lastReadAt: readingHistory.lastReadAt,
    };
  }

  // async markAsCompleted(input: IMarkAsCompletedDTO): Promise<IReadingHistoryResponse> {
  //   const readingHistory = await this.readingHistoryRepository.markAsCompleted(input);

  //   return {
  //     totalReadTime: readingHistory.totalReadTime,
  //     currentChapterSlug: readingHistory.currentChapterSlug,
  //     lastReadAt: readingHistory.lastReadAt,
  //   };
  // }

  // async getReadingHistory(userId: string): Promise<IReadingHistoryResponse[]> {
  //   const readingHistory = await this.readingHistoryRepository.getReadingHistory(userId);

  //   return readingHistory;
  // }
}

export { ReadingHistoryService };
