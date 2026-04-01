import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';

import {
  TUpdatePRMetadataBody,
  TTogglePRDraftBody,
  TUpdatePRLabelsBody,
  TSubmitPRReviewBody,
  TMergePRBody,
  TAddPRCommentBody,
} from '@schema/request/prManagement.schema';
import { PRUpdateService } from '@features/pullRequest/services/pr-update.service';
import { PRMergeService } from '@features/pullRequest/services/pr-merge.service';
import { PRReviewService } from '@features/prReview/services/prReview.service';
import { PRCommentService } from '@features/prComment/services/prComment.service';

@singleton()
export class PRManagementController extends BaseModule {
  constructor(
    @inject(TOKENS.PRUpdateService)
    private readonly prUpdateService: PRUpdateService,

    @inject(TOKENS.PRMergeService)
    private readonly prMergeService: PRMergeService,

    @inject(TOKENS.PRReviewService)
    private readonly prReviewService: PRReviewService,

    @inject(TOKENS.PRCommentService)
    private readonly prCommentService: PRCommentService
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PATCH /api/pull-requests/:prId/metadata
  // ─────────────────────────────────────────────────────────────────────────

  updateMetadata = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TUpdatePRMetadataBody;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { prId } = request.params;
      const { title, description } = request.body;

      const pr = await this.prUpdateService.updateMetadata({
        prId,
        userId,
        title,
        description,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(pr, 'Pull request updated successfully.'));
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. PATCH /api/pull-requests/:prId/draft
  // ─────────────────────────────────────────────────────────────────────────

  toggleDraft = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TTogglePRDraftBody;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { prId } = request.params;
      const { isDraft, draftReason } = request.body;

      const pr = await this.prUpdateService.toggleDraft({
        prId,
        userId,
        isDraft,
        draftReason,
      });

      const message = isDraft
        ? 'Pull request marked as draft.'
        : 'Pull request marked as ready for review.';

      return reply.code(HTTP_STATUS.OK.code).send(ApiResponse.updated(pr, message));
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PUT /api/pull-requests/:prId/labels
  // ─────────────────────────────────────────────────────────────────────────

  updateLabels = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TUpdatePRLabelsBody;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { prId } = request.params;
      const { storySlug, labels } = request.body;

      const pr = await this.prUpdateService.updateLabels({
        prId,
        storySlug,
        userId,
        labels,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(pr, 'PR labels updated successfully.'));
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. POST /api/pull-requests/:prId/reviews
  // ─────────────────────────────────────────────────────────────────────────

  submitReview = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TSubmitPRReviewBody;
      }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const { prId } = request.params;
      const { storySlug, decision, summary, overallRating } = request.body;

      const review = await this.prReviewService.submitReview({
        prId,
        storySlug,
        reviewerId,
        decision,
        summary,
        overallRating,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(review, 'Review submitted successfully.'));
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. POST /api/pull-requests/:prId/merge
  // ─────────────────────────────────────────────────────────────────────────

  mergePR = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TMergePRBody;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { prId } = request.params;
      const { storySlug } = request.body;

      const pr = await this.prMergeService.merge({
        prId,
        storySlug,
        userId,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.updated(pr, 'Pull request merged successfully.'));
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 6. POST /api/pull-requests/:prId/comments
  // ─────────────────────────────────────────────────────────────────────────

  addComment = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { prId: string };
        Body: TAddPRCommentBody;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user.clerkId;
      const { prId } = request.params;
      const { storySlug, content, parentCommentId } = request.body;

      const comment = await this.prCommentService.addComment({
        prId,
        storySlug,
        userId,
        content,
        parentCommentId,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(comment, 'Comment added successfully.'));
    }
  );
}
