import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import { CommentController } from '../controllers/comment.controller';
import { CommentResponses } from '../schema/response/comment.response.schema';
import {
  CommentByChapterSchema,
  CommentCreateSchema,
  CommentIdSchema,
  CommentUpdateSchema,
} from '@/schema/request/comment.schema';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const CommentApiRoutes = {
  Create: '/',
  Update: '/:commentId',
  Delete: '/:commentId',
  Get: '/:commentId',
  GetByChapter: '/chapter/:chapterSlug',

  // TESTING APIs
  syncCounts: '/sync-counts',
} as const;

export async function commentRoutes(fastify: FastifyInstance) {
  const commentController = container.resolve<CommentController>(TOKENS.CommentController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    CommentApiRoutes.syncCounts,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
    },
    commentController.syncCounts
  );

  fastify.post(
    CommentApiRoutes.Create,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Add a new comment',
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CommentCreateSchema),
        response: CommentResponses.commentCreated,
      },
    },
    commentController.addComment
  );

  fastify.patch(
    CommentApiRoutes.Update,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Update a comment',
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(CommentIdSchema),
        body: zodToJsonSchema(CommentUpdateSchema),
        response: CommentResponses.commentUpdated,
      },
    },
    commentController.updateComment
  );

  fastify.delete(
    CommentApiRoutes.Delete,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Delete a comment',
        tags: ['Comments'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(CommentIdSchema),
        response: CommentResponses.commentDeleted,
      },
    },
    commentController.deleteComment
  );

  fastify.get(
    CommentApiRoutes.Get,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get a comment by ID',
        tags: ['Comments'],
        params: zodToJsonSchema(CommentIdSchema),
        response: CommentResponses.commentDetails,
      },
    },
    commentController.getComment
  );

  fastify.get(
    CommentApiRoutes.GetByChapter,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get comments for a chapter',
        tags: ['Comments'],
        // querystring: zodToJsonSchema(CommentByChapterQuerySchema), // TODO: Define query schema separately if strict validation needed
        params: zodToJsonSchema(CommentByChapterSchema),
        response: CommentResponses.commentList,
      },
    },
    commentController.getComments
  );
}
