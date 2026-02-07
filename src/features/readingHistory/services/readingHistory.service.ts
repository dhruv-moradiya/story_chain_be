import { TOKENS } from '@/container/index.js';
import { IRecordHeartBeatDTO } from '@/dto/readingHistory.dto.js';
import { IReadingHistoryResponse } from '@/types/response/readingHistory.types.js';
import { BaseModule } from '@/utils/baseClass.js';
import { inject, singleton } from 'tsyringe';
import { ReadingHistoryRepository } from '../repositories/readingHistory.repository.js';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository.js';
import { IReadingHistoryService } from './interfaces/index.js';

@singleton()
class ReadingHistoryService extends BaseModule implements IReadingHistoryService {
  constructor(
    @inject(TOKENS.ReadingHistoryRepository)
    private readonly readingHistoryRepository: ReadingHistoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepository: ChapterRepository
  ) {
    super();
  }

  async upsert(input: IRecordHeartBeatDTO): Promise<IReadingHistoryResponse> {
    const { chapterSlug } = input;

    const chapter = await this.chapterRepository.findBySlug(chapterSlug, {
      isEnding: 1,
    });

    if (!chapter) {
      this.throwNotFoundError('CHAPTER_NOT_FOUND', `Chapter not found: ${chapterSlug}`);
    }

    const isEnding = chapter.isEnding;

    const readingHistory = await this.readingHistoryRepository.upsert(input, isEnding);

    return {
      totalReadTime: readingHistory.totalReadTime,
      currentChapterSlug: readingHistory.currentChapterSlug,
      lastReadAt: readingHistory.lastReadAt,
      completedPaths: readingHistory.completedPaths,
    };
  }
}

export { ReadingHistoryService };
