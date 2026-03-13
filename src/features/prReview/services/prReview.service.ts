import { TOKENS } from '@/container';
import { IGetPRReviewsDTO, ISubmitPRReviewDTO } from '@/dto/pr-review.dto';
import { StoryCollaboratorRules } from '@/domain/storyCollaborator.rules';
import { PullRequestRepository } from '@/features/pullRequest/repositories/pullRequest.repository';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { PRStatus, PRTimelineAction } from '@/features/pullRequest/types/pullRequest-enum';
import { IPullRequest } from '@/features/pullRequest/types/pullRequest.types';
import { cachePRVoteMetadata } from '@/features/prVote/utils/prVote-cache';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import {
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '@/features/storyCollaborator/types/storyCollaborator.types';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { sanitizeContent } from '@/utils/sanitizer';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrReviewRepository } from '../repositories/pr-review.repository';
import { IPRReviewWithReviewer } from '../types/prReview.types';
import { PRReviewStatus } from '../types/prReview-enum';

@singleton()
class PrReviewService extends BaseModule {
  constructor(
    @inject(TOKENS.PrReviewRepository)
    private readonly prReviewRepository: PrReviewRepository,
    @inject(TOKENS.PullRequestQueryService)
    private readonly pullRequestQueryService: PullRequestQueryService,
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  private hasStoryPermission(
    userStoryRole: TStoryCollaboratorRole | null,
    permission: TStoryCollaboratorPermission
  ) {
    return userStoryRole
      ? StoryCollaboratorRules.hasStoryPermission(userStoryRole, permission)
      : false;
  }

  private async getReviewAccessContext(userId: string, pullRequestId: string) {
    const pullRequest = await this.pullRequestQueryService.getPullRequestById(pullRequestId);
    const userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
      userId,
      pullRequest.storySlug
    );

    return {
      pullRequest,
      userStoryRole,
    };
  }

  private ensureReviewAccess(userStoryRole: TStoryCollaboratorRole | null) {
    const canReviewPRs = this.hasStoryPermission(userStoryRole, 'canReviewPRs');

    if (!canReviewPRs) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have permission to access pull request reviews for this story.'
      );
    }
  }

  private ensureCanReadReviews(
    userId: string,
    pullRequest: IPullRequest,
    userStoryRole: TStoryCollaboratorRole | null
  ) {
    const canReviewPRs = this.hasStoryPermission(userStoryRole, 'canReviewPRs');
    const isPRAuthor = pullRequest.authorId === userId;

    if (!canReviewPRs && !isPRAuthor) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have permission to access reviews for this pull request.'
      );
    }
  }

  private ensureCanSubmitReview(
    userId: string,
    pullRequest: IPullRequest,
    userStoryRole: TStoryCollaboratorRole | null
  ) {
    this.ensureReviewAccess(userStoryRole);

    if (pullRequest.authorId === userId) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You cannot submit a review for your own pull request.'
      );
    }

    const blockedStatuses = new Set<IPullRequest['status']>([
      PRStatus.CLOSED,
      PRStatus.REJECTED,
      PRStatus.MERGED,
    ]);

    if (blockedStatuses.has(pullRequest.status)) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'Reviews cannot be submitted for this pull request in its current state.'
      );
    }
  }

  private sanitizeReviewInput(input: ISubmitPRReviewDTO): ISubmitPRReviewDTO {
    return {
      ...input,
      summary: input.summary ? sanitizeContent(input.summary) : undefined,
      feedback: input.feedback?.map((item) => ({
        ...item,
        section: item.section ? sanitizeContent(item.section) : undefined,
        comment: item.comment ? sanitizeContent(item.comment) : undefined,
      })),
    };
  }

  async submitReview(input: ISubmitPRReviewDTO): Promise<IPRReviewWithReviewer> {
    const accessContext = await this.getReviewAccessContext(input.userId, input.pullRequestId);

    this.ensureCanSubmitReview(
      input.userId,
      accessContext.pullRequest,
      accessContext.userStoryRole
    );

    const sanitizedInput = this.sanitizeReviewInput(input);
    const submitResult = await this.prReviewRepository.submitReview(sanitizedInput);
    const reviewSummary = await this.prReviewRepository.getReviewSummary(input.pullRequestId);

    const approvalsReceived = reviewSummary.approvers.length;
    const approvalsPending = Math.max(
      accessContext.pullRequest.approvalsStatus.required - approvalsReceived,
      0
    );
    const canMerge = approvalsPending === 0 && reviewSummary.blockers.length === 0;

    let nextStatus: IPullRequest['status'] = accessContext.pullRequest.status;
    if (canMerge) {
      nextStatus = PRStatus.APPROVED;
    } else if (accessContext.pullRequest.status === PRStatus.APPROVED) {
      nextStatus = PRStatus.OPEN;
    }

    const timelineEntries: Array<{
      action: (typeof PRTimelineAction)[keyof typeof PRTimelineAction];
      performedBy?: string;
      performedAt: Date;
      metadata?: Record<string, unknown>;
    }> = [
      {
        action: PRTimelineAction.REVIEW_SUBMITTED,
        performedBy: input.userId,
        performedAt: new Date(),
        metadata: {
          reviewStatus: submitResult.review.reviewStatus,
          previousStatus: submitResult.previousStatus,
          isNew: submitResult.isNew,
        },
      },
    ];

    if (
      [PRReviewStatus.CHANGES_REQUESTED, PRReviewStatus.NEEDS_WORK].includes(
        submitResult.review.reviewStatus as PRReviewStatus
      )
    ) {
      timelineEntries.push({
        action: PRTimelineAction.CHANGES_REQUESTED,
        performedBy: input.userId,
        performedAt: new Date(),
        metadata: {
          reviewStatus: submitResult.review.reviewStatus,
        },
      });
    }

    if (canMerge && accessContext.pullRequest.status !== PRStatus.APPROVED) {
      timelineEntries.push({
        action: PRTimelineAction.APPROVED,
        performedBy: input.userId,
        performedAt: new Date(),
        metadata: {
          approvalsReceived,
          requiredApprovals: accessContext.pullRequest.approvalsStatus.required,
        },
      });
    }

    const updatedPullRequest = await this.pullRequestRepository.syncReviewState(
      input.pullRequestId,
      {
        status: nextStatus,
        reviewsReceived: reviewSummary.reviewsReceived,
        approvalsStatus: {
          received: approvalsReceived,
          pending: approvalsPending,
          approvers: reviewSummary.approvers,
          blockers: reviewSummary.blockers,
          canMerge,
        },
        timelineEntries,
      }
    );

    if (updatedPullRequest) {
      await cachePRVoteMetadata(this.cacheService, updatedPullRequest);
    }

    const review = await this.prReviewRepository.getReviewForPullRequestAndReviewer(
      input.pullRequestId,
      input.userId
    );

    if (!review) {
      this.throwInternalError(
        'INTERNAL_SERVER_ERROR',
        'Failed to load the submitted review. Please try again later.'
      );
    }

    return review;
  }

  async getPRReviews(input: IGetPRReviewsDTO): Promise<IPRReviewWithReviewer[]> {
    const accessContext = await this.getReviewAccessContext(input.userId, input.pullRequestId);

    this.ensureCanReadReviews(input.userId, accessContext.pullRequest, accessContext.userStoryRole);

    return this.prReviewRepository.getReviewsForPullRequest(input.pullRequestId);
  }

  async getMyPRReview(input: IGetPRReviewsDTO): Promise<IPRReviewWithReviewer | null> {
    const accessContext = await this.getReviewAccessContext(input.userId, input.pullRequestId);

    this.ensureCanReadReviews(input.userId, accessContext.pullRequest, accessContext.userStoryRole);

    return this.prReviewRepository.getReviewForPullRequestAndReviewer(
      input.pullRequestId,
      input.userId
    );
  }
}

export { PrReviewService };
