import { toId } from '@/utils';
import { BaseRepository } from '@/utils/baseClass';
import { IOperationOptions } from '@/types';
import { PipelineStage } from 'mongoose';
import { singleton } from 'tsyringe';
import { PRReview } from '@models/prReview.model';
import { ISubmitPRReviewDTO } from '@/dto/pr-review.dto';
import { PrReviewPipelineBuilder } from '../pipelines/prReview.pipeline.builder';
import {
  IPRReview,
  IPRReviewDoc,
  IPRReviewSummary,
  IPRReviewWithReviewer,
  TPRReviewStatus,
} from '../types/prReview.types';
import { PRReviewStatus } from '../types/prReview-enum';

@singleton()
class PrReviewRepository extends BaseRepository<IPRReview, IPRReviewDoc> {
  constructor() {
    super(PRReview);
  }

  async aggregateReviews<T = IPRReview>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  async findByPullRequestAndReviewer(pullRequestId: string, reviewerId: string) {
    return this.findOne({ filter: { pullRequestId, reviewerId } });
  }

  async submitReview(input: ISubmitPRReviewDTO): Promise<{
    review: IPRReview;
    previousStatus: TPRReviewStatus | null;
    isNew: boolean;
  }> {
    const existingReview = await this.findByPullRequestAndReviewer(
      input.pullRequestId,
      input.userId
    );

    if (!existingReview) {
      const review = await this.create({
        data: {
          pullRequestId: input.pullRequestId,
          reviewerId: input.userId,
          reviewStatus: input.reviewStatus,
          summary: input.summary,
          feedback: input.feedback,
          overallRating: input.overallRating,
        },
      });

      return {
        review,
        previousStatus: null,
        isNew: true,
      };
    }

    const review = await this.findOneAndUpdate({
      filter: { pullRequestId: input.pullRequestId, reviewerId: input.userId },
      update: {
        $set: {
          reviewStatus: input.reviewStatus,
          summary: input.summary,
          feedback: input.feedback,
          overallRating: input.overallRating,
        },
      },
    });

    return {
      review: review as IPRReview,
      previousStatus: existingReview.reviewStatus,
      isNew: false,
    };
  }

  async getReviewsForPullRequest(pullRequestId: string): Promise<IPRReviewWithReviewer[]> {
    const pipeline = new PrReviewPipelineBuilder()
      .matchByPullRequestId(pullRequestId)
      .attachReviewer()
      .sortByCreatedAt()
      .projectReviewDetails()
      .build();

    return this.aggregateReviews<IPRReviewWithReviewer>(pipeline);
  }

  async getReviewForPullRequestAndReviewer(
    pullRequestId: string,
    reviewerId: string
  ): Promise<IPRReviewWithReviewer | null> {
    const pipeline = new PrReviewPipelineBuilder()
      .matchByPullRequestId(pullRequestId)
      .matchByReviewerId(reviewerId)
      .attachReviewer()
      .sortByCreatedAt()
      .limit(1)
      .projectReviewDetails()
      .build();

    const [review] = await this.aggregateReviews<IPRReviewWithReviewer>(pipeline);

    return review ?? null;
  }

  async getReviewSummary(pullRequestId: string): Promise<IPRReviewSummary> {
    const [reviewSummary] = await this.model.aggregate<IPRReviewSummary>([
      {
        $match: {
          pullRequestId: toId(pullRequestId),
        },
      },
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
    ]);

    return (
      reviewSummary ?? {
        reviewsReceived: 0,
        approvers: [],
        blockers: [],
      }
    );
  }
}

export { PrReviewRepository };
