import { container } from 'tsyringe';
import { ReadingHistoryController } from '../controllers/readingHistory.controller';
import { FastifyInstance } from 'fastify';
import { TOKENS } from '@/container';
import { type AuthMiddlewareFactory } from '@/middlewares/factories';
import zodToJsonSchema from 'zod-to-json-schema';
import {
  RecordHeartBeatSchema,
  RecordSessionSchema,
  StartSessionSchema,
} from '@/schema/request/readingHistory.schema';
import { ReadingHistoryResponses } from '@/schema/response/readingHistory.response';
import { RateLimits } from '@/constants/rateLimits';
import type {} from '@fastify/rate-limit';

const ReadingHistoryRoutes = {
  RecordHeartBeat: '/record-heartbeat',
  StartSession: '/start-session',
  RecordSession: '/record-session',
} as const;

export { ReadingHistoryRoutes };

export async function readingHistoryRoutes(fastify: FastifyInstance) {
  const readingHistoryController = container.resolve<ReadingHistoryController>(
    TOKENS.ReadingHistoryController
  );

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const validateAuth = authFactory.createAuthMiddleware();

  fastify.post(
    ReadingHistoryRoutes.RecordHeartBeat,
    {
      config: { rateLimit: RateLimits.FAST_WRITE },
      schema: {
        description: 'Record heartbeat',
        tags: ['Reading History'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(RecordHeartBeatSchema),
        response: ReadingHistoryResponses.upsert,
      },
      preHandler: [validateAuth],
    },
    readingHistoryController.upsert
  );

  fastify.post(
    ReadingHistoryRoutes.StartSession,
    {
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Start a new reading session',
        tags: ['Reading History'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(StartSessionSchema),
        response: ReadingHistoryResponses.startSession,
      },
      preHandler: [validateAuth],
    },
    readingHistoryController.startSession
  );

  fastify.post(
    ReadingHistoryRoutes.RecordSession,
    {
      config: { rateLimit: RateLimits.FAST_WRITE },
      schema: {
        description: 'Record a reading session (heartbeat)',
        tags: ['Reading History'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(RecordSessionSchema),
        response: ReadingHistoryResponses.recordSession,
      },
      preHandler: [validateAuth],
    },
    readingHistoryController.recordSession
  );
}
