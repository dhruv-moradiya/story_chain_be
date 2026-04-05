import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { withTransaction } from '@utils/withTransaction';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { PRCommentRepository } from '@features/prComment/repositories/prComment.repository';
import { PRTimelineRepository } from '@features/prTimeline/repositories/prTimeline.repository';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { IPRComment } from '../types/prComment.types';
import { IAddPRCommentDTO } from '@dto/pullRequest.dto';
import { Types } from 'mongoose';
import { ID } from '@/types';
import { PRTimelineAction } from '@features/pullRequest/types/pullRequest-enum';

@singleton()
export class PRCommentService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly prRepo: PullRequestRepository,

    @inject(TOKENS.PRCommentRepository)
    private readonly commentRepo: PRCommentRepository,

    @inject(TOKENS.PRTimelineRepository)
    private readonly timelineRepo: PRTimelineRepository,

    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add Comment
  // ─────────────────────────────────────────────────────────────────────────

  async addComment(input: IAddPRCommentDTO): Promise<IPRComment> {
    const { prId, storySlug, userId, content, parentCommentId } = input;

    // Validate content length
    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 2000) {
      this.throwBadRequest('Comment content must be between 1 and 2000 characters.');
    }

    return withTransaction(`PR-Comment-${prId}`, async (session) => {
      // 1. Load PR
      const pr = await this.prRepo.findById({ id: prId, options: { session } });
      if (!pr) this.throwNotFoundError(`Pull request "${prId}" not found.`);

      // 2. Load user role
      const role = await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug);

      // 3. Permission check
      const check = PullRequestRules.canPostComment(pr, userId, role, parentCommentId ?? null);
      if (!check.allowed) this.throwForbiddenError(check.reason!);

      // 4. Validate parent comment exists if a reply
      let resolvedParentId: ID | null = null;
      if (parentCommentId) {
        const parent = await this.commentRepo.findById({ id: parentCommentId });
        if (!parent) this.throwNotFoundError(`Parent comment "${parentCommentId}" not found.`);
        if (parent.pullRequestId.toString() !== prId) {
          this.throwBadRequest('Parent comment does not belong to this pull request.');
        }
        resolvedParentId = new Types.ObjectId(parentCommentId) as unknown as ID;
      }

      // 5. Create comment
      const comment = await this.commentRepo.create({
        data: {
          pullRequestId: new Types.ObjectId(prId) as unknown as ID,
          storySlug,
          userId,
          parentCommentId: resolvedParentId,
          content: trimmed,
          isEdited: false,
        },
        options: { session },
      });

      // 6. Increment PR comment count
      await this.prRepo.incrementCommentCount(prId, { session });

      // 7. Timeline event (only for top-level comments)
      if (!parentCommentId) {
        await this.timelineRepo.appendEvent(
          {
            pullRequestId: pr._id,
            storySlug,
            action: PRTimelineAction.REVIEW_REQUESTED, // closest available: signals activity on PR
            performedBy: userId,
            metadata: { commentId: comment._id.toString() },
          },
          { session }
        );
      }

      return comment;
    });
  }
}
