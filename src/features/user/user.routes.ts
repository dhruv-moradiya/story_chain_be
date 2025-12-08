import { FastifyInstance } from 'fastify';
import { validateWebhook } from '../../middlewares/validateRequest';
import { userWebhookController } from './user.webhook.controller';
import { validateAuth } from '../../middlewares/authHandler';
import { userController } from './user.controller';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook', { preHandler: [validateWebhook] }, userWebhookController.handle);

  fastify.get('/me', { preHandler: [validateAuth] }, userController.getCurrentUserDetails);

  fastify.post('/search', { preHandler: [validateAuth] }, userController.searchUserByUsername);
}
