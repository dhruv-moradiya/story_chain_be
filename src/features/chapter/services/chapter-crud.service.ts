import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { IOperationOptions } from '@/types';
import { BaseModule } from '@utils/baseClass';
import { IChapter } from '../types/chapter.types';
import { TChapterAddRootDTO, ICreateChildChapterSimpleDTO } from '../dto/chapter.dto';
import { createSlug } from '@utils/helpter';
import { ChapterRepository } from '../repositories/chapter.repository';
import { ChapterStatus } from '../types/chapter-enum';
import { IChapterCrudService } from './interfaces/chapter-crud.interface';

@singleton()
export class ChapterCrudService extends BaseModule implements IChapterCrudService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  async createRoot(input: TChapterAddRootDTO, options: IOperationOptions = {}): Promise<IChapter> {
    const { storySlug, userId, title, content } = input;

    // 1. Calculate branch index for root (among other roots)
    const branchIndex = await this._getNextBranchIndex(storySlug, null, options);

    // 2. Generate unique slug
    const slug = this._generateSlug(title);

    // 3. Create root chapter
    const chapter = await this.chapterRepo.create(
      {
        storySlug,
        parentChapterSlug: null,
        ancestorSlugs: [],
        depth: 0,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        status: ChapterStatus.PUBLISHED,
        slug,
        branchIndex,
      },
      { session: options.session }
    );

    return chapter;
  }

  /**
   * Create a child chapter
   * Automatically sets ancestorIds, depth, status defaults to PUBLISHED, and generates slug
   */
  async createChild(
    input: ICreateChildChapterSimpleDTO,
    options: IOperationOptions = {}
  ): Promise<IChapter> {
    const {
      storySlug,
      userId,
      title,
      content,
      parentChapterSlug,
      status = ChapterStatus.DRAFT,
    } = input;

    // 1. Validate and fetch parent
    const parentChapter = await this._getParentAndValidate(parentChapterSlug, storySlug, options);

    // 2. Calculate hierarchy and index
    const { newDepth, newAncestorSlugs } = this._calculateHierarchy(parentChapter);
    const branchIndex = await this._getNextBranchIndex(storySlug, parentChapterSlug, options);

    // 3. Generate slug
    const slug = this._generateSlug(title);

    // 4. Create chapter
    const chapter = await this.chapterRepo.create(
      {
        storySlug,
        parentChapterSlug,
        ancestorSlugs: newAncestorSlugs,
        depth: newDepth,
        authorId: userId,
        title: title.trim(),
        content: content.trim(),
        status,
        slug,
        branchIndex,
      },
      { session: options.session }
    );

    // 5. Update parent stats
    await this.chapterRepo.incrementBranches(parentChapter._id.toString(), options.session);

    return chapter;
  }

  async update(
    chapterId: string,
    updates: Partial<IChapter>,
    options: IOperationOptions = {}
  ): Promise<IChapter | null> {
    return this.chapterRepo.updateById(chapterId, updates, {
      session: options.session,
      new: true,
    });
  }

  async delete(chapterId: string, options: IOperationOptions = {}): Promise<void> {
    await this.chapterRepo.softDelete({ _id: chapterId }, { session: options.session });
  }

  // ═══════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════

  private async _getParentAndValidate(
    parentChapterSlug: string,
    storySlug: string,
    options: IOperationOptions
  ): Promise<IChapter> {
    const parentChapter = await this.chapterRepo.findBySlug(
      parentChapterSlug,
      {},
      { session: options.session }
    );

    if (!parentChapter) {
      this.throwNotFoundError('Parent chapter not found.');
    }

    if (parentChapter.storySlug !== storySlug) {
      this.throwBadRequest('Parent chapter does not belong to the same story.');
    }

    return parentChapter;
  }

  private _calculateHierarchy(parentChapter: IChapter): {
    newDepth: number;
    newAncestorSlugs: string[];
  } {
    return {
      newDepth: parentChapter.depth + 1,
      newAncestorSlugs: [...parentChapter.ancestorSlugs, parentChapter.slug],
    };
  }

  private async _getNextBranchIndex(
    storySlug: string,
    parentChapterSlug: string | null,
    options: IOperationOptions
  ): Promise<number> {
    const siblingCount = await this.chapterRepo.countSiblings(storySlug, parentChapterSlug, {
      session: options.session,
    });
    return siblingCount + 1;
  }

  private _generateSlug(title: string): string {
    return createSlug(title, { addSuffix: true });
  }
}
