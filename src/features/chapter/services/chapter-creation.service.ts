import { ChapterRules } from '@/domain/chapter.roles';
import { StoryQueryService } from '@/features/story/services';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services';
import { StoryCollaboratorRole } from '@/features/storyCollaborator/types/storyCollaborator-enum';
import { StoryCacheService } from '@/infrastructure/cache/story-cache.service';
import { IOperationOptions } from '@/types';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@utils/baseClass';
import { createSlug } from '@utils/helpter';
import { sanitizeContent } from '@/utils/sanitizer';
import { inject, singleton } from 'tsyringe';
import { ICreateChildChapterSimpleDTO, TChapterAddRootDTO } from '../dto/chapter.dto';
import { ChapterRepository } from '../repositories/chapter.repository';
import { ChapterStatus } from '../types/chapter-enum';
import { IChapter } from '../types/chapter.types';
import { IChapterCreationService } from './interfaces/chapter-creation.interface';
import { chapterVersionRepository } from '@/features/chapterVersion/repositories/chapterVersion.repository';

@singleton()
export class ChapterCreationService extends BaseModule implements IChapterCreationService {
  constructor(
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.StoryCacheService)
    private readonly storyCacheService: StoryCacheService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════

  private async getParentAndValidate(
    parentChapterSlug: string,
    storySlug: string,
    options: IOperationOptions
  ): Promise<IChapter> {
    const parentChapter = await this.chapterRepo.findBySlug(parentChapterSlug, {
      session: options.session,
    });

    if (!parentChapter) {
      this.throwNotFoundError('Parent chapter not found.');
    }

    const validation = ChapterRules.validateParent(parentChapter, storySlug);
    if (!validation.allowed) {
      this.throwBadRequest(validation.message!);
    }

    return parentChapter;
  }

  private async getNextBranchIndex(
    storySlug: string,
    parentChapterSlug: string | null,
    options: IOperationOptions
  ): Promise<number> {
    const siblingCount = await this.chapterRepo.countSiblings(storySlug, parentChapterSlug, {
      session: options.session,
    });

    return siblingCount + 1;
  }

  private generateSlug(title: string): string {
    return createSlug(title, { addSuffix: true });
  }

  private async createInitialVersion(
    chapter: IChapter,
    input: { userId: string; content: string; title: string },
    options: IOperationOptions
  ): Promise<void> {
    await chapterVersionRepository.create({
      data: {
        chapterSlug: chapter.slug,
        version: 1,
        content: input.content,
        title: input.title,
        editedBy: input.userId,
      },
      options: { session: options.session },
    });
  }

  // ═══════════════════════════════════════════
  // PUBLIC METHODS
  // ═══════════════════════════════════════════

  async createRoot(input: TChapterAddRootDTO, options: IOperationOptions = {}): Promise<IChapter> {
    const { storySlug, userId, title, content } = input;
    const normalizedTitle = title.trim();
    const normalizedContent = sanitizeContent(content.trim());

    // 1. Verify that no root chapter currently exists for this story
    const rootChapter = await this.chapterRepo.findOne({
      filter: { storySlug, parentChapterSlug: null },
      projection: { _id: 1 },
      options: { session: options.session },
    });

    if (rootChapter) {
      this.throwBadRequest('Root chapter already exists.');
    }

    // 2. Calculate branch index for root (relative to other possible roots)
    const branchIndex = await this.getNextBranchIndex(storySlug, null, options);

    // 3. Generate unique slug based on title
    const slug = this.generateSlug(normalizedTitle);

    // 4. Create and persist the root chapter
    const chapter = await this.chapterRepo.create({
      data: {
        storySlug,
        parentChapterSlug: null,
        ancestorSlugs: [],
        depth: 0,
        authorId: userId,
        content: normalizedContent,
        title: normalizedTitle,
        status: ChapterStatus.PUBLISHED,
        slug,
        branchIndex,
      },
      options: { session: options.session },
    });

    await this.createInitialVersion(
      chapter,
      {
        userId,
        content: normalizedContent,
        title: normalizedTitle,
      },
      options
    );

    // 5. Invalidate relevant story cache
    await this.storyCacheService.invalidateStoryLatestChapters(storySlug);

    return chapter;
  }

  /**
   * Create a child chapter
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
    const normalizedTitle = title.trim();
    const normalizedContent = sanitizeContent(content.trim());

    // 1. Fetch story context
    const story = await this.storyQueryService.getBySlug(storySlug, options);

    if (!story) {
      this.throwNotFoundError('Story not found.');
    }

    // 2. Identify user role for authorization
    const userRole = await this.collaboratorQueryService.getCollaboratorRole(
      userId,
      storySlug,
      options
    );

    // Only Owner and Co-Author can bypass branching/approval restrictions
    const isAuthorOrCoAuthor =
      userRole === StoryCollaboratorRole.OWNER || userRole === StoryCollaboratorRole.CO_AUTHOR;

    // 3. Apply Domain Rules (Authorization & Status)
    const creationRule = ChapterRules.canCreateChapter(story, isAuthorOrCoAuthor);
    if (!creationRule.allowed) {
      this.throwUnauthorizedError(creationRule.message!);
    }

    // const publishRule = ChapterRules.canPublishDirectly(story, status, isAuthorOrCoAuthor);
    // if (!publishRule.allowed) {
    //   this.throwUnauthorizedError(publishRule.message!);
    // }

    // 4. Validate and fetch parent
    const parentChapter = await this.getParentAndValidate(parentChapterSlug, storySlug, options);

    // 5. Calculate hierarchy and indexing
    const { depth: newDepth, ancestorSlugs: newAncestorSlugs } =
      ChapterRules.calculateHierarchy(parentChapter);
    const branchIndex = await this.getNextBranchIndex(storySlug, parentChapterSlug, options);

    // 6. Generate unique slug
    const slug = this.generateSlug(normalizedTitle);

    // 7. Persist chapter to database
    const chapter = await this.chapterRepo.create({
      data: {
        storySlug,
        parentChapterSlug,
        ancestorSlugs: newAncestorSlugs,
        depth: newDepth,
        authorId: userId,
        content: normalizedContent,
        title: normalizedTitle,
        status,
        slug,
        branchIndex,
      },
      options: { session: options.session },
    });

    await this.createInitialVersion(
      chapter,
      {
        userId,
        content: normalizedContent,
        title: normalizedTitle,
      },
      options
    );

    // 8. Update parent statistics and clean cache
    await this.chapterRepo.incrementBranches(parentChapter.slug, options.session);
    await this.storyCacheService.invalidateStoryLatestChapters(storySlug);

    return chapter;
  }
}
