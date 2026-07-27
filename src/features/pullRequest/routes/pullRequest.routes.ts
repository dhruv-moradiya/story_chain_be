import { FastifyInstance } from 'fastify';
import type {} from '@fastify/rate-limit';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import {
  CreatePRFromDraftBodySchema,
  CreatePRFromAutoSaveBodySchema,
  StorySlugParamSchema,
} from '@schema/request/pullRequest.schema';
import { type PullRequestController } from '../controllers/pullRequest.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Route constants
// ─────────────────────────────────────────────────────────────────────────────

const PullRequestApiRoutes = {
  /**
   * Create a PR from an existing draft chapter.
   * The story slug is taken from :slug so we can resolve settings & collaborator role.
   */
  CreateFromDraft: '/stories/:slug/from-draft',

  /**
   * Create a PR from an auto-save record.
   * The story slug is derived from the auto-save document itself.
   * We still keep :slug in the path for consistency (it is validated against the auto-save).
   */
  CreateFromAutoSave: '/stories/:slug/from-autosave',
} as const;

export { PullRequestApiRoutes };

// ─────────────────────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────────────────────

export async function pullRequestRoutes(fastify: FastifyInstance) {
  const prController = container.resolve<PullRequestController>(TOKENS.PullRequestController);
  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  // ──────────────────────────────────────────────────────
  // POST /api/pull-requests/stories/:slug/from-draft
  // ──────────────────────────────────────────────────────
  fastify.post(
    PullRequestApiRoutes.CreateFromDraft,
    {
      preHandler: [validateAuth],
      // config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description:
          'Create a new pull request from an existing draft chapter. ' +
          'If story.settings.allowBranching = false or story.settings.isPublic = false, only collaborators can create PRs. ' +
          'If story.settings.allowBranching = true & isPublic = true, any authenticated user can open a PR.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugParamSchema),
        body: zodToJsonSchema(CreatePRFromDraftBodySchema),
      },
    },
    prController.createFromDraft
  );

  // ──────────────────────────────────────────────────────
  // POST /api/pull-requests/stories/:slug/from-autosave
  // ──────────────────────────────────────────────────────
  fastify.post(
    PullRequestApiRoutes.CreateFromAutoSave,
    {
      preHandler: [validateAuth],
      // config: { rateLimit: RateLimits.CREATION_HOURLY },
      schema: {
        description:
          'Create a new pull request from an auto-saved draft. ' +
          'The auto-save must belong to the authenticated user. ' +
          'For update_chapter auto-saves the PR is also linked back to the chapter document.',
        tags: ['Pull Requests'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(StorySlugParamSchema),
        body: zodToJsonSchema(CreatePRFromAutoSaveBodySchema),
      },
    },
    prController.createFromAutoSave
  );
}
