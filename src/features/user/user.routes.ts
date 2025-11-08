import { FastifyInstance } from 'fastify';
import { validateWebhook } from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { validateAuth } from '../../middlewares/authHandler';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook', { preHandler: [validateWebhook] }, UserController.handleWebhookEvents);

  fastify.get('/me', { preHandler: [validateAuth] }, UserController.getCurrentUserProfile);

  fastify.get('/:id', { preHandler: [validateAuth] }, UserController.getUserProfile);
}
