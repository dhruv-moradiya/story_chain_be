import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import { createBookmarkSchema } from '../schema/bookmark.schema';
import { BookmarkController } from '../controllers/bookmark.controller';
import { BookmarkResponses } from '../schema/response/bookmark.response.schema';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const BookmarkApiRoutes = {
  Toggle: '/toggle',
} as const;

export async function bookmarkRoutes(fastify: FastifyInstance) {
  const bookmarkController = container.resolve<BookmarkController>(TOKENS.BookmarkController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    BookmarkApiRoutes.Toggle,
    {
      preHandler: [validateAuth],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Toggle bookmark for a story chapter',
        tags: ['Bookmarks'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createBookmarkSchema),
        response: BookmarkResponses.toggle,
      },
    },
    bookmarkController.toggleBookmark
  );
}
