import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import { type NotificationController } from '../controllers/notification.controller';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

export async function notificationRoutes(fastify: FastifyInstance) {
  const notificationController = container.resolve<NotificationController>(
    TOKENS.NotificationController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.get(
    '/',
    { preHandler: [validateAuth], config: { rateLimit: RateLimits.AUTHENTICATED } },
    notificationController.getUserNotifications
  );
}
