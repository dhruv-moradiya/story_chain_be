import { ID, IOperationOptions } from '../../types';
import { buildChapterTree, toId } from '../../utils';
import { ApiError } from '../../utils/apiResponse';
import { BaseModule } from '../../utils/baseClass';
import { withTransaction } from '../../utils/withTransaction';
import { ChapterVersionRepository } from '../chapterVersion/repositories/chapterVersion.repository';
import { StoryRepository } from '../story/repository/story.repository';
import { IChapter, IChapterContentUpdateInput, IChapterTitleUpdateInput } from './chapter.types';
import { IChapterAddChildDTO, TChapterAddRootDTO } from './dto/chapter.dto';
import { ChapterRepository } from './repositories/chapter.repository';
import { ChapterValidator } from './validators/chapter.validator';

// ========================================
// MAIN SERVICE CLASS
// ========================================

// Input type for createChapter
export interface IChapterCreateInput {
  storyId: string;
  parentChapterId?: string;
  content: string;
  title: string;
  userId: string;
}

export class ChapterService extends BaseModule {
  private readonly chapterRepo: ChapterRepository;
  private readonly storyRepo: StoryRepository;

  private readonly chapterValidator: ChapterValidator;

  private readonly chapterVersionRepo: ChapterVersionRepository;

  constructor() {
    super();

    // Repositories
    this.chapterRepo = new ChapterRepository();
    this.storyRepo = new StoryRepository();

    // Validators
    this.chapterValidator = new ChapterValidator();

    this.chapterVersionRepo = new ChapterVersionRepository();
  }

  // 🪄 Future methods: typed placeholders for next handlers
  async publishChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async deleteChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async updateChapterTitle(input: IChapterTitleUpdateInput): Promise<IChapter> {
    return await withTransaction('Updating chapter title', async (session) => {
      const { chapterId, userId, title } = input;

      const chapter = await this.chapterValidator.validateChapterOwnership(userId, chapterId);

      const updatedChapter = await this.chapterRepo.updateById(
        chapterId,
        { title: title.trim() },
        { new: true, session }
      );

      if (!updatedChapter) {
        throw ApiError.internalError('Failed to update chapter title');
      }

      await this.chapterVersionRepo.create(
        {
          chapterId: toId(chapter._id),
          version: (chapter.version || 1) + 1,
          content: updatedChapter.content,
          title: updatedChapter.title,
          changesSummary: 'Title updated',
          editedBy: userId,
        },
        { session }
      );

      return updatedChapter;
    });
  }

  async updateChapterContent(input: IChapterContentUpdateInput): Promise<IChapter> {
    return await withTransaction('Updating chapter title', async (session) => {
      const { chapterId, userId, content } = input;

      const chapter = await this.chapterValidator.validateChapterOwnership(userId, chapterId);

      const updatedChapter = await this.chapterRepo.updateById(
        chapterId,
        { content: content.trim() },
        { new: true, session }
      );

      if (!updatedChapter) {
        throw ApiError.internalError('Failed to update chapter title');
      }

      await this.chapterVersionRepo.create(
        {
          chapterId: toId(chapter._id),
          version: (chapter.version || 1) + 1,
          content: updatedChapter.content,
          title: updatedChapter.title,
          changesSummary: 'Title updated',
          editedBy: userId,
        },
        { session }
      );

      return updatedChapter;
    });
  }

  async getChapterById(chapterId: ID, options: IOperationOptions = {}): Promise<IChapter | null> {
    const chapter = this.chapterRepo.findById(chapterId, {}, { session: options.session });
    return chapter;
  }

  async getStoryTree(storyId: string): Promise<{ storyId: string; chapters: IChapter[] }> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      throw ApiError.notFound('Story not found');
    }

    const chapters = await this.chapterRepo.findByStoryId(storyId);

    if (!chapters || chapters.length === 0) {
      return {
        storyId: storyId,
        chapters: [],
      };
    }

    const tree = buildChapterTree(chapters);

    return {
      storyId: storyId,
      chapters: tree,
    };
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
        status: 'PUBLISHED',
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
        status: 'PUBLISHED',
      },
      { session: options.session }
    );

    return chapter;
  }
}

export const chapterService = new ChapterService();
