import { FastifyInstance } from 'fastify';
import type {} from '@fastify/rate-limit';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import { RateLimits } from '@/constants/rateLimits';
import {
  PRIdParamSchema,
  UpdatePRMetadataBodySchema,
  TogglePRDraftBodySchema,
  UpdatePRLabelsBodySchema,
  SubmitPRReviewBodySchema,
  MergePRBodySchema,
  AddPRCommentBodySchema,
} from '@schema/request/prManagement.schema';
import { type PRManagementController } from '../controllers/prManagement.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Route constants
// ─────────────────────────────────────────────────────────────────────────────

const PRManagementRoutes = {
  UpdateMetadata: '/:prId/metadata',
  ToggleDraft: '/:prId/draft',
  UpdateLabels: '/:prId/labels',
  SubmitReview: '/:prId/reviews',
  Merge: '/:prId/merge',
  AddComment: '/:prId/comments',
} as const;

export { PRManagementRoutes };

// ─────────────────────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────────────────────

export async function prManagementRoutes(fastify: FastifyInstance) {
  const ctrl = container.resolve<PRManagementController>(TOKENS.PRManagementController);
  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  // ──────────────────────────────────────────────────────
  // PATCH /:prId/metadata  — update title / description
  // ──────────────────────────────────────────────────────
  fastify.patch(
    PRManagementRoutes.UpdateMetadata,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Update the title or description of a pull request. Only the PR author can do this, and only while the PR is open.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(UpdatePRMetadataBodySchema),
      },
    },
    ctrl.updateMetadata
  );

  // ──────────────────────────────────────────────────────
  // PATCH /:prId/draft  — toggle draft / ready_for_review
  // ──────────────────────────────────────────────────────
  fastify.patch(
    PRManagementRoutes.ToggleDraft,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Mark a pull request as a draft (hidden from review queue) or as ready for review. Only the PR author can change this.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(TogglePRDraftBodySchema),
      },
    },
    ctrl.toggleDraft
  );

  // ──────────────────────────────────────────────────────
  // PUT /:prId/labels  — replace label set
  // ──────────────────────────────────────────────────────
  fastify.put(
    PRManagementRoutes.UpdateLabels,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Replace the label set on a pull request. Requires moderator or higher role in the story.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(UpdatePRLabelsBodySchema),
      },
    },
    ctrl.updateLabels
  );

  // ──────────────────────────────────────────────────────
  // POST /:prId/reviews  — submit a review
  // ──────────────────────────────────────────────────────
  fastify.post(
    PRManagementRoutes.SubmitReview,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Submit or update a review on a pull request. ' +
          'feedback_only: reviewer+. ' +
          'approve / changes_requested: moderator+. ' +
          'Self-review is blocked unless you are the story owner.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(SubmitPRReviewBodySchema),
      },
    },
    ctrl.submitReview
  );

  // ──────────────────────────────────────────────────────
  // POST /:prId/merge  — merge the PR
  // ──────────────────────────────────────────────────────
  fastify.post(
    PRManagementRoutes.Merge,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Merge an approved pull request into the story. Requires moderator+. ' +
          'Co-authors and owners can force-merge even without the required approvals.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(MergePRBodySchema),
      },
    },
    ctrl.mergePR
  );

  // ──────────────────────────────────────────────────────
  // POST /:prId/comments  — add a comment or reply
  // ──────────────────────────────────────────────────────
  fastify.post(
    PRManagementRoutes.AddComment,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description:
          'Post a comment on a pull request. Supply parentCommentId to create a threaded reply. ' +
          'Contributors can only comment on their own PRs; reviewer+ can comment on any PR.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(PRIdParamSchema),
        body: zodToJsonSchema(AddPRCommentBodySchema),
      },
    },
    ctrl.addComment
  );
}
