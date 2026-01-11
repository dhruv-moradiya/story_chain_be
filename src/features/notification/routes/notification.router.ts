import { FastifyInstance } from 'fastify';
import { validateAuth } from '@middleware/authHandler';
import { notificationController } from '../controllers/notification.controller';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [validateAuth] }, notificationController.getUserNotifications);
}
