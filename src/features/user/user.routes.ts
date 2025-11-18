import { FastifyInstance } from 'fastify';
import { validateWebhook } from '../../middlewares/validateRequest';
import { userWebhookController } from './user.webhook.controller';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post('/webhook', { preHandler: [validateWebhook] }, userWebhookController.handle);
}
