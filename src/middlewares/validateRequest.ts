import { ZodSchema } from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Webhook } from 'svix';
import { logger } from '@utils/logger';

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: Record<string, string[]> };

export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ValidationResult<T> | void> => {
    if (!request.body) {
      reply.code(400).send({ error: 'Request body is required' });
      return;
    }

    const result = schema.safeParse(request.body);

    if (!result.success) {
      const formattedError = result.error.flatten().fieldErrors;
      reply.code(400).send({ success: false, error: formattedError });
      return;
    }

    // attach validated data to request for route use
    return { success: true, data: result.data };
  };
}

export async function validateWebhook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      logger.error('Missing Clerk Webhook Secret');
      return reply.code(500).send('Server misconfigured');
    }

    const svixId = request.headers['svix-id'];
    const svixTimestamp = request.headers['svix-timestamp'];
    const svixSignature = request.headers['svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.error('Missing svix headers');
      return reply.code(400).send({ error: 'Missing svix headers' });
    }

    const payloadString =
      typeof request.body === 'string'
        ? request.body
        : Buffer.isBuffer(request.body)
          ? request.body.toString('utf8')
          : JSON.stringify(request.body);

    const wh = new Webhook(WEBHOOK_SECRET);

    const event = wh.verify(payloadString, {
      'svix-id': svixId as string,
      'svix-timestamp': svixTimestamp as string,
      'svix-signature': svixSignature as string,
    });

    // eslint-disable-next-line
    (request as any).clerkEvent = event;
    return;
  } catch (error) {
    logger.error('Webhook verification failed:', error);
    return reply.code(400).send({ error: 'Invalid webhook signature' });
  }
}
