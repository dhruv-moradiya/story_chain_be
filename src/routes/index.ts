import { FastifyInstance } from 'fastify';
import { userRoutes } from '../features/user/user.routes';
import { storyRoutes } from '../features/story/story.routes';
import { chapterRoutes } from '../features/chapter/chapter.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(userRoutes, { prefix: '/api/users' });
  fastify.register(storyRoutes, { prefix: '/api/stories' });
  fastify.register(chapterRoutes, { prefix: '/api/stories' });
  // Add more routes here
  // fastify.register(orderRoutes, { prefix: '/api/orders' });
  // fastify.register(adminRoutes, { prefix: '/api/admin' });
}
