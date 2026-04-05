import { inject, singleton } from 'tsyringe';
import { withTransaction } from '@utils/withTransaction';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';

import { IStory } from '@features/story/types/story.types';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import {
  ROLE_HIERARCHY,
  StoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator-enum';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';

import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { ChapterStatus } from '@features/chapter/types/chapter-enum';
import { IChapter } from '@features/chapter/types/chapter.types';

import { ChapterAutoSaveRepository } from '@features/chapterAutoSave/repositories/chapterAutoSave.repository';
import { IChapterAutoSave } from '@features/chapterAutoSave/types/chapterAutoSave.types';

import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { IPullRequest } from '../types/pullRequest.types';
import { PRStatus } from '../types/pullRequest-enum';

import { ICreatePRFromAutoSaveDTO, ICreatePRFromDraftDTO } from '@dto/pullRequest.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calculateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function calculateReadingMinutes(wordCount: number): number {
  // average reading speed: 200 wpm
  return Math.ceil(wordCount / 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission helpers (aligned with PR_SYSTEM.md Role × Permission Matrix)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns whether the user is allowed to open a PR in a given story.
 *
 * Rules:
 * 1. If story.settings.allowBranching = false → only story collaborators can submit PRs.
 * 2. If story.settings.allowBranching = true  → anyone (even non-collaborators) can open a PR.
 * 3. But wait — per scenario 4: if allowBranching = true AND the user is NOT a collaborator,
 *    they still CANNOT create a PR (they are not a collaborator). We block them.
 *    Only existing collaborators (any role ≥ contributor) may open PRs.
 *
 * The permission matrix says "Open a PR: ✓ for all roles" — but that refers to roles in the
 * collaborator system. A user with NO role has no permission at all.
 */
function canOpenPR(
  _story: IStory,
  userRole: TStoryCollaboratorRole | null
): { allowed: boolean; reason?: string } {
  // User has no role in the story → not a collaborator at all
  if (!userRole) {
    return {
      allowed: false,
      reason:
        'You must be a story collaborator to create a pull request. Ask the story owner for access.',
    };
  }

  // story.settings.allowBranching = true + not a collaborator is already blocked above.
  // All valid collaborator roles (contributor to owner) can open PRs per the matrix.
  const minRoleLevel = ROLE_HIERARCHY[StoryCollaboratorRole.CONTRIBUTOR];
  if (ROLE_HIERARCHY[userRole] < minRoleLevel) {
    return {
      allowed: false,
      reason: 'Your role does not grant permission to open pull requests.',
    };
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@singleton()
export class PullRequestCommandService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly prRepo: PullRequestRepository,

    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,

    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,

    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,

    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly autoSaveRepo: ChapterAutoSaveRepository
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Guards
  // ─────────────────────────────────────────────────────────────────────────

  private async loadStoryOrThrow(storySlug: string): Promise<IStory> {
    return this.storyQueryService.getBySlug(storySlug);
  }

  private async loadUserRoleOrThrow(
    authorId: string,
    storySlug: string
  ): Promise<TStoryCollaboratorRole | null> {
    return this.collaboratorQueryService.getCollaboratorRole(authorId, storySlug);
  }

  private checkPermission(story: IStory, userRole: TStoryCollaboratorRole | null): void {
    const check = canOpenPR(story, userRole);
    if (!check.allowed) {
      this.throwForbiddenError(check.reason!);
    }
  }

  private async checkNoDuplicateOpenPR(chapterSlug: string, authorId: string): Promise<void> {
    const existing = await this.prRepo.findOpenByChapterAndAuthor(chapterSlug, authorId);
    if (existing) {
      this.throwConflictError(
        `You already have an open pull request for chapter "${chapterSlug}". Close or merge it before submitting a new one.`
      );
    }
  }

  private async loadDraftChapterOrThrow(chapterSlug: string, authorId: string): Promise<IChapter> {
    const chapter = await this.chapterRepo.findBySlug(chapterSlug);

    if (!chapter) {
      this.throwNotFoundError(`Draft chapter "${chapterSlug}" not found.`);
    }

    if (chapter.status !== ChapterStatus.DRAFT) {
      this.throwBadRequest(
        `Only draft chapters can be used to create a pull request. Chapter "${chapterSlug}" has status "${chapter.status}".`
      );
    }

    if (chapter.authorId !== authorId) {
      this.throwForbiddenError('You can only submit a pull request for your own draft chapters.');
    }

    if (chapter.pullRequest?.isPR && chapter.pullRequest.prId) {
      this.throwConflictError(`This chapter is already linked to an existing pull request.`);
    }

    return chapter;
  }

  private async loadAutoSaveOrThrow(
    autoSaveId: string,
    authorId: string
  ): Promise<IChapterAutoSave> {
    const autoSave = await this.autoSaveRepo.findById({ id: autoSaveId });

    if (!autoSave) {
      this.throwNotFoundError(`Auto-save "${autoSaveId}" not found.`);
    }

    if (autoSave.userId !== authorId) {
      this.throwForbiddenError(
        'You can only submit a pull request for your own auto-saved content.'
      );
    }

    if (!autoSave.content || autoSave.content.trim().length < 50) {
      this.throwBadRequest(
        'Auto-save content is too short to create a pull request (minimum 50 characters).'
      );
    }

    return autoSave;
  }

  private buildAutoApproveConfig(_story: IStory) {
    // Mirror story settings into PR auto-approve config
    // The story model doesn't expose autoApprove thresholds yet, so we use sensible defaults
    // that can be customised later via a separate API.
    return {
      enabled: false, // off by default; owner/co_author can enable later
      threshold: 10,
      timeWindow: 7,
    };
  }

  private buildApprovalsStatus(story: IStory) {
    return {
      required: story.settings.requireApproval ? 1 : 0,
      received: 0,
      pending: story.settings.requireApproval ? 1 : 0,
      approvers: [] as string[],
      blockers: [] as string[],
      canMerge: !story.settings.requireApproval,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: Create PR from Draft Chapter
  // ─────────────────────────────────────────────────────────────────────────

  async createFromDraft(input: ICreatePRFromDraftDTO): Promise<IPullRequest> {
    const {
      chapterSlug,
      storySlug,
      title,
      description,
      parentChapterSlug,
      prType,
      isDraft = false,
      draftReason,
      authorId,
    } = input;

    return withTransaction(`CreatePR-FromDraft-${chapterSlug}`, async (session) => {
      // 1. Load story
      const story = await this.loadStoryOrThrow(storySlug);

      // 2. Resolve user role and check permission
      const userRole = await this.loadUserRoleOrThrow(authorId, storySlug);
      this.checkPermission(story, userRole);

      // 3. Load and validate the draft chapter
      const chapter = await this.loadDraftChapterOrThrow(chapterSlug, authorId);

      // 4. Guard: no duplicate open PR for the same chapter
      await this.checkNoDuplicateOpenPR(chapterSlug, authorId);

      // 5. Compute content stats
      const wordCount = calculateWordCount(chapter.content);
      const readingMinutes = calculateReadingMinutes(wordCount);

      // 6. Create the PullRequest document
      const pr = await this.prRepo.create({
        data: {
          title: title.trim(),
          description: description?.trim() ?? '',
          storySlug,
          chapterSlug,
          parentChapterSlug,
          authorId,
          prType,
          content: {
            proposed: chapter.content,
            wordCount,
            readingMinutes,
          },
          status: PRStatus.OPEN,
          isDraft,
          ...(isDraft && draftReason ? { draftReason, draftedAt: new Date() } : {}),
          autoApprove: this.buildAutoApproveConfig(story),
          approvalsStatus: this.buildApprovalsStatus(story),
          labels: [],
          votes: { upvotes: 0, downvotes: 0, score: 0 },
          commentCount: 0,
          stats: { views: 0, discussions: 0, reviewsReceived: 0 },
        },
        options: { session },
      });

      // 7. Link the PR back to the chapter document
      await this.chapterRepo.updateById(
        chapter._id.toString(),
        {
          $set: {
            'pullRequest.isPR': true,
            'pullRequest.prId': pr._id,
            'pullRequest.status': 'pending',
            'pullRequest.submittedAt': new Date(),
          },
        },
        { new: true, session }
      );

      return pr;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: Create PR from AutoSave
  // ─────────────────────────────────────────────────────────────────────────

  async createFromAutoSave(input: ICreatePRFromAutoSaveDTO): Promise<IPullRequest> {
    const {
      autoSaveId,
      title,
      description,
      parentChapterSlug,
      prType,
      isDraft = false,
      draftReason,
      authorId,
    } = input;

    return withTransaction(`CreatePR-FromAutoSave-${autoSaveId}`, async (session) => {
      // 1. Load and validate the auto-save (owns storySlug)
      const autoSave = await this.loadAutoSaveOrThrow(autoSaveId, authorId);
      const storySlug = autoSave.storySlug;

      // 2. Load story
      const story = await this.loadStoryOrThrow(storySlug);

      // 3. Resolve user role and check permission
      const userRole = await this.loadUserRoleOrThrow(authorId, storySlug);
      this.checkPermission(story, userRole);

      // 4. Determine chapterSlug for the PR:
      //    - update_chapter autosaves are linked to an existing chapter slug
      //    - new_chapter / root_chapter autosaves have no chapter slug yet;
      //      we use a synthetic slug derived from the autoSave _id so the PR
      //      has a unique chapterSlug (the real slug is assigned on merge).
      const chapterSlug =
        autoSave.autoSaveType === 'update_chapter' && autoSave.chapterSlug
          ? autoSave.chapterSlug
          : `draft-pr-${autoSave._id.toString()}`;

      // 5. Guard: no duplicate open PR for the same chapter (only for update_chapter)
      if (autoSave.autoSaveType === 'update_chapter' && autoSave.chapterSlug) {
        await this.checkNoDuplicateOpenPR(autoSave.chapterSlug, authorId);
      }

      // 6. Compute content stats
      const wordCount = calculateWordCount(autoSave.content);
      const readingMinutes = calculateReadingMinutes(wordCount);

      // 7. Create the PullRequest document
      const pr = await this.prRepo.create({
        data: {
          title: title.trim(),
          description: description?.trim() ?? '',
          storySlug,
          chapterSlug,
          parentChapterSlug,
          authorId,
          prType,
          content: {
            proposed: autoSave.content,
            wordCount,
            readingMinutes,
          },
          status: PRStatus.OPEN,
          isDraft,
          ...(isDraft && draftReason ? { draftReason, draftedAt: new Date() } : {}),
          autoApprove: this.buildAutoApproveConfig(story),
          approvalsStatus: this.buildApprovalsStatus(story),
          labels: [],
          votes: { upvotes: 0, downvotes: 0, score: 0 },
          commentCount: 0,
          stats: { views: 0, discussions: 0, reviewsReceived: 0 },
        },
        options: { session },
      });

      // 8. If this is an update_chapter autosave, link the PR back to the chapter
      if (autoSave.autoSaveType === 'update_chapter' && autoSave.chapterSlug) {
        const chapter = await this.chapterRepo.findBySlug(autoSave.chapterSlug, { session });

        if (chapter) {
          await this.chapterRepo.updateById(
            chapter._id.toString(),
            {
              $set: {
                'pullRequest.isPR': true,
                'pullRequest.prId': pr._id,
                'pullRequest.status': 'pending',
                'pullRequest.submittedAt': new Date(),
              },
            },
            { new: true, session }
          );
        }
      }

      return pr;
    });
  }
}
