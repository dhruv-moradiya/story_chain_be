import { BaseRepository } from '@/utils/baseClass';
import { IOperationOptions } from '@/types';
import { PipelineStage } from 'mongoose';
import { singleton } from 'tsyringe';
import { PRReview } from '@models/prReview.model';
import { PrReviewPipelineBuilder } from '../pipelines/prReview.pipeline.builder';
import {
  IPRReview,
  IPRReviewDoc,
  IPRReviewSummary,
  IPRReviewWithReviewer,
} from '../types/prReview.types';

@singleton()
class PrReviewRepository extends BaseRepository<IPRReview, IPRReviewDoc> {
  constructor() {
    super(PRReview);
  }

  // ─── Internal aggregation helper ────────────────────────────────────────

  async aggregateReviews<T = IPRReview>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }

  // ─── Finders ────────────────────────────────────────────────────────────

  async findByPullRequestAndReviewer(pullRequestId: string, reviewerId: string) {
    return this.findOne({ filter: { pullRequestId, reviewerId } });
  }

  // ─── Write operations (pure DB — no business logic) ─────────────────────

  /**
   * Creates a new review document.
   * Caller (service) is responsible for deciding whether to create or update.
   */
  async createReview(
    input: Pick<
      IPRReview,
      'pullRequestId' | 'reviewerId' | 'reviewStatus' | 'summary' | 'feedback' | 'overallRating'
    >
  ): Promise<IPRReview> {
    return this.create({ data: input });
  }

  /**
   * Updates an existing review document.
   * Caller (service) provides the exact fields to overwrite.
   */
  async updateReview(
    pullRequestId: string,
    reviewerId: string,
    update: Pick<IPRReview, 'reviewStatus' | 'summary' | 'feedback' | 'overallRating'>
  ): Promise<IPRReview | null> {
    return this.findOneAndUpdate({
      filter: { pullRequestId, reviewerId },
      update: {
        $set: {
          reviewStatus: update.reviewStatus,
          summary: update.summary,
          feedback: update.feedback,
          overallRating: update.overallRating,
        },
      },
    });
  }

  // ─── Aggregate queries ───────────────────────────────────────────────────

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
    const pipeline = new PrReviewPipelineBuilder().buildReviewSummaryPipeline(pullRequestId);

    const [reviewSummary] = await this.aggregateReviews<IPRReviewSummary>(pipeline);

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
