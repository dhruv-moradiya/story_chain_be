import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { withTransaction } from '@utils/withTransaction';
import { PullRequestRules } from '@domain/pullRequest.rules';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { PRReviewRepository } from '@features/prReview/repositories/prReview.repository';
import { PRTimelineRepository } from '@features/prTimeline/repositories/prTimeline.repository';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';
import { IPRReview } from '@features/prReview/types/prReview.types';
import { PRReviewDecision } from '@features/prReview/types/prReview-enum';
import { ISubmitPRReviewDTO } from '@dto/pullRequest.dto';
import { PR_REVIEW_DECISIONS } from '@features/prReview/types/prReview-enum';
import { PRTimelineAction } from '@features/pullRequest/types/pullRequest-enum';

@singleton()
export class PRReviewService extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly prRepo: PullRequestRepository,

    @inject(TOKENS.PRReviewRepository)
    private readonly reviewRepo: PRReviewRepository,

    @inject(TOKENS.PRTimelineRepository)
    private readonly timelineRepo: PRTimelineRepository,

    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Submit Review
  // ─────────────────────────────────────────────────────────────────────────

  async submitReview(input: ISubmitPRReviewDTO): Promise<IPRReview> {
    const { prId, storySlug, reviewerId, decision, summary, overallRating } = input;

    // Validate decision value early
    if (!(PR_REVIEW_DECISIONS as readonly string[]).includes(decision)) {
      this.throwBadRequest(
        `Invalid review decision "${decision}". Must be one of: ${PR_REVIEW_DECISIONS.join(', ')}.`
      );
    }

    const typedDecision = decision as IPRReview['decision'];

    return withTransaction(`PR-Review-${prId}`, async (session) => {
      // 1. Load PR
      const pr = await this.prRepo.findById({ id: prId, options: { session } });
      if (!pr) this.throwNotFoundError(`Pull request "${prId}" not found.`);

      // 2. Load reviewer's role
      const role = await this.collaboratorQueryService.getCollaboratorRole(reviewerId, storySlug);

      // 3. Permission check (also validates self-review)
      const check = PullRequestRules.canSubmitReview(pr, reviewerId, role, typedDecision);
      if (!check.allowed) this.throwForbiddenError(check.reason!);

      // 4. Upsert the review
      const { review, isNew } = await this.reviewRepo.upsertReview(
        {
          pullRequestId: pr._id,
          storySlug,
          reviewerId,
          decision: typedDecision,
          summary: summary.trim(),
          overallRating,
        },
        { session }
      );

      // 5. Recompute approvalsStatus
      const allReviews = await this.reviewRepo.findByPR(pr._id, { session });
      const updatedApprovals = this.recomputeApprovalsStatus(pr, allReviews);
      await this.prRepo.patchApprovalsStatus(prId, updatedApprovals, { session });

      // 6. If all approvals received → auto-set status to 'approved'
      if (updatedApprovals.canMerge && pr.status === 'open') {
        await this.prRepo.setStatus(prId, 'approved', { session });
      }

      // 7. If there's a blocker (changes_requested) → revert status to open if it was approved
      if (typedDecision === PRReviewDecision.CHANGES_REQUESTED && pr.status === 'approved') {
        await this.prRepo.setStatus(prId, 'open', { session });
      }

      // 8. Timeline event — always use review_submitted (no separate review_updated in enum)
      await this.timelineRepo.appendEvent(
        {
          pullRequestId: pr._id,
          storySlug,
          action: PRTimelineAction.REVIEW_SUBMITTED,
          performedBy: reviewerId,
          metadata: { decision, isUpdate: !isNew },
        },
        { session }
      );

      return review;
    });
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private recomputeApprovalsStatus(
    pr: IPullRequest,
    allReviews: IPRReview[]
  ): IPullRequest['approvalsStatus'] {
    const approvers: string[] = [];
    const blockers: string[] = [];

    for (const r of allReviews) {
      if (r.decision === PRReviewDecision.APPROVE) {
        approvers.push(r.reviewerId);
      } else if (r.decision === PRReviewDecision.CHANGES_REQUESTED) {
        blockers.push(r.reviewerId);
      }
    }

    const received = approvers.length;
    const required = pr.approvalsStatus.required;
    const pending = Math.max(0, required - received);
    const canMerge = PullRequestRules.recalculateCanMerge({
      required,
      received,
      pending,
      approvers,
      blockers,
      canMerge: false,
    });

    return { required, received, pending, approvers, blockers, canMerge };
  }
}
