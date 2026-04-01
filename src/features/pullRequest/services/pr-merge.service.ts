import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { withTransaction } from '@utils/withTransaction';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { PRTimelineRepository } from '@features/prTimeline/repositories/prTimeline.repository';
import { PullRequestRepository } from '../repositories/pullRequest.repository';
import { IPullRequest } from '../types/pullRequest.types';
import { IMergePRDTO } from '@dto/pullRequest.dto';

@singleton()
export class PRMergeService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly prRepo: PullRequestRepository,

    @inject(TOKENS.PRTimelineRepository)
    private readonly timelineRepo: PRTimelineRepository,

    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,

    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Merge PR
  // ─────────────────────────────────────────────────────────────────────────

  async merge(input: IMergePRDTO): Promise<IPullRequest> {
    const { prId, storySlug, userId } = input;

    return withTransaction(`PR-Merge-${prId}`, async (session) => {
      // 1. Load PR
      const pr = await this.prRepo.findById({ id: prId, options: { session } });
      if (!pr) this.throwNotFoundError(`Pull request "${prId}" not found.`);

      // 2. Check role
      const role = await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug);

      // 3. Permission check (validates status, role, and canMerge/forceMerge)
      const check = PullRequestRules.canMerge(pr, role);
      if (!check.allowed) this.throwForbiddenError(check.reason!);

      // 4. Set PR status to merged
      const merged = await this.prRepo.setStatus(prId, 'merged', { session });
      if (!merged) this.throwInternalError('Failed to merge pull request.');

      // 5. Update the linked chapter's pullRequest status to 'merged'
      if (pr.chapterSlug && !pr.chapterSlug.startsWith('draft-pr-')) {
        const chapter = await this.chapterRepo.findBySlug(pr.chapterSlug, { session });
        if (chapter) {
          await this.chapterRepo.updateById(
            chapter._id.toString(),
            {
              $set: {
                'pullRequest.status': 'merged',
              },
            },
            { new: true, session }
          );
        }
      }

      // 6. Timeline event
      await this.timelineRepo.appendEvent(
        {
          pullRequestId: pr._id,
          storySlug,
          action: 'merged',
          performedBy: userId,
          metadata: { mergedAt: new Date().toISOString() },
        },
        { session }
      );

      return merged;
    });
  }
}
