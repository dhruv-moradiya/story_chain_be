import { container } from 'tsyringe';
import { ReadingHistoryController } from '../controllers/readingHistory.controller';
import { FastifyInstance } from 'fastify';
import { TOKENS } from '@/container';
import { validateAuth } from '@/middlewares/authHandler';
import zodToJsonSchema from 'zod-to-json-schema';
import {
  RecordHeartBeatSchema,
  RecordSessionSchema,
  StartSessionSchema,
} from '@/schema/request/readingHistory.schema';
import { ReadingHistoryResponses } from '@/schema/response/readingHistory.response';

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

  fastify.post(
    ReadingHistoryRoutes.RecordHeartBeat,
    {
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
