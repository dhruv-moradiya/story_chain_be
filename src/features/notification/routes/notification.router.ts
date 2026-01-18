import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { validateAuth } from '@middleware/authHandler';
import { type NotificationController } from '../controllers/notification.controller';

export async function notificationRoutes(fastify: FastifyInstance) {
  const notificationController = container.resolve<NotificationController>(
    TOKENS.NotificationController
  );

  fastify.get('/', { preHandler: [validateAuth] }, notificationController.getUserNotifications);
}
