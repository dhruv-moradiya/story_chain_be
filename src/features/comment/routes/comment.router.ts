import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import { CommentController } from '../controllers/comment.controller';
import { CommentResponses } from '../schema/response/comment.response.schema';
import {
  CommentByChapterSchema,
  CommentCreateSchema,
  CommentIdSchema,
  CommentUpdateSchema,
} from '@/schema/request/comment.schema';
import { rateLimiter } from '@/middlewares/rateLimiter.middleware';

const CommentApiRoutes = {
  Create: '/',
  Update: '/:commentId',
  Delete: '/:commentId',
  Get: '/:commentId',
  GetByChapter: '/chapter/:chapterSlug',
} as const;

export async function commentRoutes(fastify: FastifyInstance) {
  const commentController = container.resolve<CommentController>(TOKENS.CommentController);

  fastify.post(
    CommentApiRoutes.Create,
    {
      preHandler: [validateAuth, rateLimiter],
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
      preHandler: [validateAuth, rateLimiter],
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
      preHandler: [validateAuth, rateLimiter],
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
