import { FastifyInstance } from 'fastify';
import { userRoutes } from '@features/user/routes/user.routes';
import { storyRoutes } from '@features/story/routes/story.routes';
import { chapterRoutes } from '@features/chapter/routes/chapter.routes';
import { notificationRoutes } from '@features/notification/routes/notification.router';
import { chapterAutoSaveRoutes } from '@features/chapterAutoSave/routes/chapterAutoSave.routes';
import { readingHistoryRoutes } from '@/features/readingHistory/routes/readingHistory.router';
import { bookmarkRoutes } from '@/features/bookmark/routes/bookmark.routes';

enum ApiRoute {
  USERS = '/api/users',
  STORIES = '/api/stories',
  CHAPTERS = '/api/chapters',
  NOTIFICATIONS = '/api/notifications',
  CHAPTERAUTOSAVE = '/api/auto-save',
  READINGHISTORY = '/api/reading-history',
  BOOKMARKS = '/api/bookmarks',
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: ApiRoute.USERS });
  fastify.register(storyRoutes, { prefix: ApiRoute.STORIES });
  fastify.register(chapterRoutes, { prefix: ApiRoute.CHAPTERS });
  fastify.register(notificationRoutes, { prefix: ApiRoute.NOTIFICATIONS });
  fastify.register(chapterAutoSaveRoutes, { prefix: ApiRoute.CHAPTERAUTOSAVE });
  fastify.register(readingHistoryRoutes, { prefix: ApiRoute.READINGHISTORY });
  fastify.register(bookmarkRoutes, { prefix: ApiRoute.BOOKMARKS });
}
