import { FastifyInstance } from 'fastify';
import { userRoutes } from '@features/user/routes/user.routes';
import { storyRoutes } from '@features/story/routes/story.routes';
import { notificationRoutes } from '@features/notification/routes/notification.router';
import { chapterAutoSaveRoutes } from '@features/chapterAutoSave/routes/chapterAutoSave.routes';

enum ApiRoute {
  USERS = '/api/users',
  STORIES = '/api/stories',
  NOTIFICATIONS = '/api/notifications',
  CHAPTERAUTOSAVE = '/api/auto-save',
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: ApiRoute.USERS });
  fastify.register(storyRoutes, { prefix: ApiRoute.STORIES });
  fastify.register(notificationRoutes, { prefix: ApiRoute.NOTIFICATIONS });
  fastify.register(chapterAutoSaveRoutes, { prefix: ApiRoute.CHAPTERAUTOSAVE });
}
