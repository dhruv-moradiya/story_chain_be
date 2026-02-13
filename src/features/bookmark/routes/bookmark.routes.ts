import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import zodToJsonSchema from 'zod-to-json-schema';
import { TOKENS } from '@container/tokens';
import { validateAuth } from '@middleware/authHandler';
import { createBookmarkSchema } from '../schema/bookmark.schema';
import { BookmarkController } from '../controllers/bookmark.controller';
import { BookmarkResponses } from '../schema/response/bookmark.response.schema';

const BookmarkApiRoutes = {
  Toggle: '/toggle',
} as const;

export async function bookmarkRoutes(fastify: FastifyInstance) {
  const bookmarkController = container.resolve<BookmarkController>(TOKENS.BookmarkController);

  fastify.post(
    BookmarkApiRoutes.Toggle,
    {
      preHandler: [validateAuth],
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
