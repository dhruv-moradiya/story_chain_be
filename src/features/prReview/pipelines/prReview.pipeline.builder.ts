import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { toId } from '@/utils';

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
}

export { PrReviewPipelineBuilder };
