import { FastifyInstance } from 'fastify';
import { userRoutes } from '../features/user/user.routes';
import { storyRoutes } from '../features/story/story.routes';
import { chapterRoutes } from '../features/chapter/chapter.routes';
import { notificationRoutes } from '../features/notification/notification.router';

enum ApiRoute {
  USERS = '/api/users',
  STORIES = '/api/stories',
  NOTIFICATIONS = '/api/notifications',
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: ApiRoute.USERS });
  fastify.register(storyRoutes, { prefix: ApiRoute.STORIES });
  fastify.register(chapterRoutes, { prefix: ApiRoute.STORIES });
  fastify.register(notificationRoutes, { prefix: ApiRoute.NOTIFICATIONS });
}
