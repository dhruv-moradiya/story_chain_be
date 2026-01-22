import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { ID, IOperationOptions } from '@/types';
import { BaseModule } from '@utils/baseClass';
import { IChapter } from '../types/chapter.types';
import { IChapterAddChildDTO, TChapterAddRootDTO } from '../dto/chapter.dto';
import {
  ChapterRepository,
  IChapterDetails,
  IChapterWithStory,
} from '../repositories/chapter.repository';
import { ChapterStatus } from '../types/chapter-enum';

// Input type for createChapter
export interface IChapterCreateInput {
  storyId: string;
  parentChapterId?: string;
  content: string;
  title: string;
  userId: string;
}

// Simplified input for creating child chapter (without requiring ancestorIds, depth, status)
export interface ICreateChildChapterInput {
  storyId: string;
  userId: string;
  parentChapterId: string;
  title: string;
  content: string;
}

@singleton()
export class ChapterService extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async getChapterById(chapterId: ID, options: IOperationOptions = {}): Promise<IChapter | null> {
    const chapter = this.chapterRepo.findById(chapterId, {}, { session: options.session });
    return chapter;
  }

  async createRootChapter(
    input: TChapterAddRootDTO,
    options: IOperationOptions = {}
  ): Promise<IChapter> {
    const { storyId, userId, title, content } = input;

    const chapter = this.chapterRepo.create(
      {
        storyId,
        parentChapterId: null,
        ancestorIds: [],
        depth: 0,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        status: ChapterStatus.PUBLISHED,
      },
      { session: options.session }
    );

    return chapter;
  }

  async createChildChapter(input: IChapterAddChildDTO, options: IOperationOptions = {}) {
    const { storyId, userId, title, content, parentChapterId } = input;

    const chapter = this.chapterRepo.create(
      {
        storyId,
        parentChapterId,
        ancestorIds: [],
        depth: 0,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        status: ChapterStatus.PUBLISHED,
      },
      { session: options.session }
    );

    return chapter;
  }

  /**
   * Create a child chapter with simplified input
   * Automatically sets ancestorIds, depth, and status
   */
  async createChildChapterSimple(
    input: ICreateChildChapterInput,
    options: IOperationOptions = {}
  ): Promise<IChapter> {
    const { storyId, userId, title, content, parentChapterId } = input;

    // TODO: In future, calculate ancestorIds and depth from parent chapter
    // For now, set to defaults (similar to existing createChildChapter)
    const chapter = await this.chapterRepo.create(
      {
        storyId,
        parentChapterId,
        ancestorIds: [],
        depth: 0,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        status: ChapterStatus.PUBLISHED,
      },
      { session: options.session }
    );

    return chapter;
  }

  /**
   * Get all chapters created by a user with story info
   */
  async getChaptersByUser(userId: string): Promise<IChapterWithStory[]> {
    return this.chapterRepo.findByAuthorWithStory(userId);
  }

  /**
   * Get chapter details by ID with story and author info
   */
  async getChapterDetails(chapterId: string): Promise<IChapterDetails | null> {
    return this.chapterRepo.findByIdWithDetails(chapterId);
  }
}
