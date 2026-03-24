import { IOperationOptions } from '@/types';
import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { IPullRequestDto, IUpdatePRLableDTO } from '@dto/pullRequest.dto';
import { IPullRequest, TPRType } from '@features/pullRequest/types/pullRequest.types';
import { IStoryCollaborator } from '@features/storyCollaborator/types/storyCollaborator.types';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { StoryCollaboratorRepository } from '@features/storyCollaborator/repositories/storyCollaborator.repository';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { StoryCollaboratorStatus } from '@features/storyCollaborator/types/storyCollaborator-enum';
import { PRType } from '@features/pullRequest/types/pullRequest-enum';
import { IStory } from '@features/story/types/story.types';
import { ICreatePullRequestService } from '@features/pullRequest/services/interfaces/create-pull-request.service';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { PullRequestDiffService } from '@/features/pullRequest/services/pull-request-diff.service';
import { PRStatus, PRTimelineAction } from '@features/pullRequest/types/pullRequest-enum';
import { CacheService } from '@/infrastructure/cache/cache.service';
import {
  buildPRVoteStatsFromPullRequest,
  cachePRVoteMetadata,
  cachePRVoteSummary,
} from '@/features/prVote/utils/prVote-cache';
import { ChapterQueryService } from '@/features/chapter/services/chapter-query.service';

/**
 * Service for managing Pull Requests.
 * Orchestrates validation, diff calculation, and persistence.
 */
@singleton()
export class PullRequestService extends BaseModule implements ICreatePullRequestService {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
    @inject(TOKENS.PullRequestDiffService)
    private readonly pullRequestDiffService: PullRequestDiffService,
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService,
    @inject(TOKENS.ChapterQueryService)
    private readonly chapterQueryService: ChapterQueryService,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: StoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepository: ChapterRepository,
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly storyCollaboratorRepository: StoryCollaboratorRepository
  ) {
    super();
  }

  /**
   * Creates a new Pull Request.
   *
   * Steps:
   * 1. Validate the request (permissions, existence, duplicates).
   * 2. Calculate diffs between original and proposed content.
   * 3. Persist the PR to the database.
   */
  async create(input: IPullRequestDto): Promise<IPullRequest> {
    const {
      userId,
      storySlug,
      chapterSlug,
      parentChapterSlug,
      prType,
      title,
      description,
      isDraft,
    } = input;

    // ── 1. Validate Request ──────────────────────────────────────────────────
    const story = await this.validateStory(storySlug);
    const collaborator = await this.validateCollaborator(storySlug, userId);
    this.validatePullRequestRules(story, collaborator);

    if (prType === PRType.NEW_CHAPTER) {
      if (!parentChapterSlug) {
        this.throwBadRequest('PARENT_CHAPTER_REQUIRED', 'Parent chapter slug is required.');
      }
      const parentChapter = await this.chapterRepository.findBySlug(parentChapterSlug);
      if (!parentChapter) {
        this.throwNotFoundError('PARENT_CHAPTER_NOT_FOUND', 'Parent chapter not found.');
      }
      if (parentChapter.storySlug !== storySlug) {
        this.throwBadRequest(
          'INVALID_PARENT_CHAPTER',
          'Parent chapter does not belong to this story.'
        );
      }
    } else {
      const chapter = await this.chapterRepository.findBySlug(chapterSlug);
      if (!chapter) {
        this.throwNotFoundError('CHAPTER_NOT_FOUND', 'Chapter not found.');
      }
      if (chapter.storySlug !== storySlug) {
        this.throwBadRequest('INVALID_CHAPTER', 'Target chapter does not belong to this story.');
      }
    }

    await this.validateDuplicatePR(userId, storySlug, chapterSlug);

    // ── 2. Build Changes (Diff) ──────────────────────────────────────────────
    const resolvedChanges = this.pullRequestDiffService.resolveChanges(input);

    // ── 3. Create PR ─────────────────────────────────────────────────────────
    const pr = await this.pullRequestRepository.create({
      data: {
        title,
        description: description ?? '',
        storySlug,
        chapterSlug,
        parentChapterSlug,
        authorId: userId,
        prType,
        changes: resolvedChanges,
        status: PRStatus.OPEN,
        isDraft: isDraft ?? false,
        timeline: [
          {
            action: PRTimelineAction.CREATED,
            performedBy: userId,
            performedAt: new Date(),
          },
        ],
      },
    });

    await Promise.all([
      cachePRVoteMetadata(this.cacheService, pr),
      cachePRVoteSummary(this.cacheService, String(pr._id), buildPRVoteStatsFromPullRequest(pr)),
    ]);

    this.logInfo(`PR created: "${pr.title}" [${prType}] by ${userId} for story ${storySlug}`);

    return pr;
  }

  async updatePRLable(input: IUpdatePRLableDTO) {
    const { prId, labels } = input;

    const pr = await this.pullRequestRepository.updatePRLable(prId, labels);

    if (!pr) {
      this.throwNotFoundError(
        'PULL_REQUEST_NOT_FOUND',
        'The requested pull request was not found. Please check the ID and try again.'
      );
    }

    return pr;
  }

  async generate(
    input: {
      chapterSlug: string;
      storySlug: string;
      userId: string;
      prType: TPRType;
      title: string;
      description: string;
    },
    options: IOperationOptions = {}
  ) {
    const { chapterSlug, storySlug, userId } = input;

    // ── 1. Validate Generate Request ─────────────────────────────────────────
    const story = await this.validateStory(storySlug);
    const collaborator = await this.validateCollaborator(storySlug, userId);
    this.validatePullRequestRules(story, collaborator);
    await this.validateDuplicatePR(userId, storySlug, chapterSlug);

    // ── 2. Fetch Chapter ─────────────────────────────────────────────────────
    const chapter = await this.chapterQueryService.getBySlug(chapterSlug, {
      session: options.session,
    });

    if (!chapter) {
      this.throwNotFoundError('Chapter not found.');
    }
  }

  // ═══════════════════════════════════════════
  // PRIVATE VALIDATION HELPERS
  // ═══════════════════════════════════════════

  private async validateStory(storySlug: string): Promise<IStory> {
    const story = await this.storyRepository.findBySlug(storySlug);
    if (!story) {
      this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found.');
    }
    return story;
  }

  private async validateCollaborator(
    storySlug: string,
    userId: string
  ): Promise<IStoryCollaborator> {
    const collaborator = await this.storyCollaboratorRepository.findByStoryAndUser(
      storySlug,
      userId
    );

    if (!collaborator || collaborator.status !== StoryCollaboratorStatus.ACCEPTED) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You must be an accepted collaborator to create a pull request.'
      );
    }
    return collaborator;
  }

  private validatePullRequestRules(story: IStory, collaborator: IStoryCollaborator): void {
    if (!PullRequestRules.canRoleCreatePR(collaborator.role)) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'Your collaborator role does not permit creating pull requests.'
      );
    }

    const genRule = PullRequestRules.canGeneratePR(story, collaborator.role);
    if (!genRule.allowed) {
      this.throwForbiddenError('FORBIDDEN', genRule.message!);
    }
  }

  private async validateDuplicatePR(
    userId: string,
    storySlug: string,
    chapterSlug: string
  ): Promise<void> {
    const existingOpenPRs = await this.pullRequestRepository.findOpenPRsByAuthorForStory(
      userId,
      storySlug
    );
    const openChapterSlugs = existingOpenPRs.map((pr) => pr.chapterSlug);

    if (PullRequestRules.hasDuplicateOpenPR(userId, chapterSlug, openChapterSlugs)) {
      this.throwConflictError(
        'CONFLICT',
        'You already have an open pull request for this chapter. Close or merge it first.'
      );
    }
  }
}
