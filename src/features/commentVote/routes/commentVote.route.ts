import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { CommentVoteController } from '../controllers/commentVote.controller';
import { RateLimits } from '@/constants/rateLimits';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import zodToJsonSchema from 'zod-to-json-schema';
import { CastCommentVoteSchema } from '@/schema/request/commentVote.schem';

// CommentVote API Routes
export const CommentVoteApiRoutes = {
  CastVote: '/',
} as const;

export async function commentVoteRoutes(fastify: FastifyInstance) {
  // Resolve dependencies
  // If you register CommentVoteController in TOKENS, replace CommentVoteController with TOKENS.CommentVoteController
  const commentVoteController = container.resolve(CommentVoteController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  // ===============================
  // COMMENT VOTE ROUTES
  // ===============================

  // Cast a vote on a comment
  fastify.post(
    CommentVoteApiRoutes.CastVote,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Cast or update a vote on a comment',
        tags: ['Comment Votes'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CastCommentVoteSchema),
      },
    },
    commentVoteController.castVote
  );
}
