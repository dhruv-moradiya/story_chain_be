import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { IStoryCollaborator } from '@features/storyCollaborator/types/storyCollaborator.types';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { StoryCollaboratorRepository } from '@features/storyCollaborator/repositories/storyCollaborator.repository';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { StoryCollaboratorStatus } from '@features/storyCollaborator/types/storyCollaborator-enum';
import { PRType } from '@features/pullRequest/types/pullRequest-enum';

/**
 * Validator service for Pull Request logic.
 * Ensures data integrity and permission checks before service logic.
 * Promotes Clean Architecture and SRP.
 */
@singleton()
export class PullRequestValidator extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: StoryRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepository: ChapterRepository,
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly storyCollaboratorRepository: StoryCollaboratorRepository,
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository
  ) {
    super();
  }

  /**
   * Validates all conditions for creating a PR.
   * Throws errors if any condition is not met.
   * Returns the collaborator if validation succeeds.
   */
  async validateCreateRequest(
    userId: string,
    storySlug: string,
    chapterSlug: string,
    parentChapterSlug: string,
    prType: string
  ): Promise<IStoryCollaborator> {
    // ── 1. Verify Story Exists ──────────────────────────────────────────────
    const story = await this.storyRepository.findBySlug(storySlug);
    if (!story) {
      this.throwNotFoundError('Story not found', 'STORY_NOT_FOUND');
    }

    // ── 2. Verify Collaborator Status ──────────────────────────────────────
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

    // ── 3. Verify Role Permissions ────────────────────────────────────────
    if (!PullRequestRules.canRoleCreatePR(collaborator.role)) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'Your collaborator role does not permit creating pull requests.'
      );
    }

    // ── 4. Verify Chapter/Parent Hierarchy ────────────────────────────────
    if (prType === PRType.NEW_CHAPTER) {
      // Must have a valid parent chapter that belongs to this story
      const parentChapter = await this.chapterRepository.findBySlug(parentChapterSlug);
      if (!parentChapter) {
        this.throwNotFoundError('Parent chapter not found', 'PARENT_CHAPTER_NOT_FOUND');
      }
      if (parentChapter.storySlug !== storySlug) {
        this.throwBadRequest(
          'INVALID_PARENT_CHAPTER',
          'Parent chapter does not belong to this story.'
        );
      }
    } else {
      // EDIT/DELETE: The chapter itself must exist
      const chapter = await this.chapterRepository.findBySlug(chapterSlug);
      if (!chapter) {
        this.throwNotFoundError('Chapter not found', 'CHAPTER_NOT_FOUND');
      }
      if (chapter.storySlug !== storySlug) {
        this.throwBadRequest('INVALID_CHAPTER', 'Target chapter does not belong to this story.');
      }
    }

    // ── 5. Check for Duplicates ──────────────────────────────────────────
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

    // Return collaborator in case we need to use it (e.g. valid user info)
    return collaborator;
  }
}
