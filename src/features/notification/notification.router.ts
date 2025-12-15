import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { notificationController } from './notification.controller';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [validateAuth] }, notificationController.getUserNotifications);
}
