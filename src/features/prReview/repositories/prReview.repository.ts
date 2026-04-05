import { singleton } from 'tsyringe';
import { PRReview } from '@models/prReview.model';
import { BaseRepository } from '@utils/baseClass';
import { IPRReview, IPRReviewDoc } from '@features/prReview/types/prReview.types';
import { IOperationOptions } from '@/types';
import { ID } from '@/types';

@singleton()
export class PRReviewRepository extends BaseRepository<IPRReview, IPRReviewDoc> {
  constructor() {
    super(PRReview);
  }

  findByPRAndReviewer(
    pullRequestId: ID,
    reviewerId: string,
    options: IOperationOptions = {}
  ): Promise<IPRReview | null> {
    return this.findOne({
      filter: { pullRequestId, reviewerId },
      options,
    });
  }

  findByPR(pullRequestId: ID, options: IOperationOptions = {}): Promise<IPRReview[]> {
    return this.find({
      filter: { pullRequestId },
      options,
    });
  }

  /**
   * Upsert a review — if one exists (same reviewer+PR), update it; otherwise create it.
   * Returns { review, isNew }.
   */
  async upsertReview(
    input: {
      pullRequestId: ID;
      storySlug: string;
      reviewerId: string;
      decision: IPRReview['decision'];
      summary: string;
      overallRating?: number;
    },
    options: IOperationOptions = {}
  ): Promise<{ review: IPRReview; isNew: boolean }> {
    const existing = await this.findByPRAndReviewer(input.pullRequestId, input.reviewerId, options);

    if (existing) {
      const updated = await this.findOneAndUpdate({
        filter: { pullRequestId: input.pullRequestId, reviewerId: input.reviewerId },
        update: {
          $set: {
            previousDecision: existing.decision,
            decision: input.decision,
            summary: input.summary,
            ...(input.overallRating !== undefined ? { overallRating: input.overallRating } : {}),
            isUpdated: true,
            updatedAt_review: new Date(),
          },
        },
        options: { new: true, session: options.session },
      });

      return { review: updated!, isNew: false };
    }

    const review = await this.create({
      data: {
        pullRequestId: input.pullRequestId,
        storySlug: input.storySlug,
        reviewerId: input.reviewerId,
        decision: input.decision,
        summary: input.summary,
        ...(input.overallRating !== undefined ? { overallRating: input.overallRating } : {}),
        isUpdated: false,
        updatedAt_review: new Date(),
      },
      options,
    });

    return { review, isNew: true };
  }
}
