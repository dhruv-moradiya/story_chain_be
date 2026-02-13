import { TOKENS } from '@/container/index.js';
import {
  IRecordHeartBeatDTO,
  IRecordSessionDTO,
  IStartSessionDTO,
} from '@/dto/readingHistory.dto.js';
import { IReadingHistoryResponse } from '@/types/response/readingHistory.types.js';
import { BaseModule } from '@/utils/baseClass.js';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository.js';
import { inject, singleton } from 'tsyringe';
import { ReadingHistoryRepository } from '../repositories/readingHistory.repository.js';
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
      totalReadTime: readingHistory.totalStoryReadTime,
      currentChapterSlug: readingHistory.currentChapterSlug,
      lastReadAt: readingHistory.lastReadAt,
      completedPaths: readingHistory.completedPaths,
    };
  }

  async startSession(input: IStartSessionDTO) {
    // STEP 1: Ensure ReadingHistory exists (atomic upsert)
    await this.readingHistoryRepository.initializeSession({
      userId: input.userId,
      storySlug: input.storySlug,
    });

    // STEP 2: Try updating existing chapter entry (atomic)
    const updateExisting = await this.readingHistoryRepository.tryUpdateSession({
      userId: input.userId,
      storySlug: input.storySlug,
      chapterSlug: input.chapterSlug,
      sessionId: input.sessionId,
    });

    // If chapter already existed → done
    if (updateExisting) {
      return;
    }

    // STEP 3: Chapter does NOT exist → push new entry (atomic)
    await this.readingHistoryRepository.addNewChapterSession({
      userId: input.userId,
      storySlug: input.storySlug,
      chapterSlug: input.chapterSlug,
      sessionId: input.sessionId,
    });

    return;
  }

  async heartbeat(input: IRecordSessionDTO) {
    const HEARTBEAT_INTERVAL = 30; // seconds
    const MAX_ALLOWED_GAP = 40; // seconds
    const QUALIFY_THRESHOLD = 20; // seconds

    // STEP 1 — Try to increment read time (valid session only)
    const updateResult = await this.readingHistoryRepository.updateHeartbeat(
      {
        userId: input.userId,
        storySlug: input.storySlug,
        chapterSlug: input.chapterSlug,
        sessionId: input.sessionId,
      },
      {
        maxAllowedGap: MAX_ALLOWED_GAP,
        incrementAmount: HEARTBEAT_INTERVAL,
      }
    );

    // If nothing matched -> session invalid or expired
    if (!updateResult) {
      // Reset session (do NOT increment time)
      await this.readingHistoryRepository.resetActiveSession({
        userId: input.userId,
        storySlug: input.storySlug,
        chapterSlug: input.chapterSlug,
        sessionId: input.sessionId,
      });

      return;
    }

    // STEP 2 — Check qualification (only if not yet qualified)
    const history = await this.readingHistoryRepository.getUnqualifiedChapterSession(
      input.userId,
      input.storySlug,
      input.chapterSlug
    );

    if (!history) return;

    const chapter = history.chaptersRead[0];

    if (chapter.totalReadTime >= QUALIFY_THRESHOLD) {
      // STEP 3 — Mark as qualified (atomic)
      const qualifyResult = await this.readingHistoryRepository.markChapterAsQualified(
        input.userId,
        input.storySlug,
        input.chapterSlug
      );

      if (qualifyResult) {
        // STEP 4 — Increment Chapter stats
        await this.chapterRepository.incrementReads(input.chapterSlug);
      }
    }
  }
}

export { ReadingHistoryService };
