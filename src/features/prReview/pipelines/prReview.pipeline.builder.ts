import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { toId } from '@/utils';
import { PRReviewStatus } from '../types/prReview-enum';

class PrReviewPipelineBuilder extends BasePipelineBuilder<PrReviewPipelineBuilder> {
  matchByPullRequestId(pullRequestId: string) {
    return this.matchField('pullRequestId', toId(pullRequestId));
  }

  matchByReviewerId(reviewerId: string) {
    return this.matchField('reviewerId', reviewerId);
  }

  attachReviewer() {
    return this.addStages([
      {
        $lookup: {
          from: 'users',
          let: { reviewerId: '$reviewerId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$clerkId', '$$reviewerId'],
                },
              },
            },
            {
              $project: {
                clerkId: 1,
                username: 1,
                email: 1,
                avatarUrl: 1,
              },
            },
          ],
          as: 'reviewer',
        },
      },
      {
        $unwind: {
          path: '$reviewer',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
  }

  projectReviewDetails() {
    return this.project({
      _id: 1,
      pullRequestId: 1,
      reviewerId: 1,
      reviewStatus: 1,
      summary: 1,
      feedback: 1,
      overallRating: 1,
      createdAt: 1,
      updatedAt: 1,
      reviewer: 1,
    });
  }

  /**
   * Builds a pipeline that aggregates all reviews for a PR into a summary:
   * { reviewsReceived, approvers[], blockers[] }
   */
  buildReviewSummaryPipeline(pullRequestId: string) {
    return this.matchByPullRequestId(pullRequestId)
      .addStages([
        {
          $group: {
            _id: '$pullRequestId',
            reviewsReceived: { $sum: 1 },
            approvers: {
              $push: {
                $cond: [{ $eq: ['$reviewStatus', PRReviewStatus.APPROVED] }, '$reviewerId', null],
              },
            },
            blockers: {
              $push: {
                $cond: [
                  {
                    $in: [
                      '$reviewStatus',
                      [PRReviewStatus.CHANGES_REQUESTED, PRReviewStatus.NEEDS_WORK],
                    ],
                  },
                  '$reviewerId',
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            reviewsReceived: 1,
            approvers: {
              $filter: {
                input: '$approvers',
                as: 'reviewerId',
                cond: { $ne: ['$$reviewerId', null] },
              },
            },
            blockers: {
              $filter: {
                input: '$blockers',
                as: 'reviewerId',
                cond: { $ne: ['$$reviewerId', null] },
              },
            },
          },
        },
      ])
      .build();
  }
}

export { PrReviewPipelineBuilder };
