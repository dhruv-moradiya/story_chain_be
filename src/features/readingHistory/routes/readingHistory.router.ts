import { container } from 'tsyringe';
import { ReadingHistoryController } from '../controllers/readingHistory.controller';
import { FastifyInstance } from 'fastify';
import { TOKENS } from '@/container';
import { validateAuth } from '@/middlewares/authHandler';
import zodToJsonSchema from 'zod-to-json-schema';
import { RecordHeartBeatSchema } from '@/schema/request/readingHistory.schema';
import { ReadingHistoryResponses } from '@/schema/response/readingHistory.response';

const ReadingHistoryRoutes = {
  RecordHeartBeat: '/record-heartbeat',
} as const;

export { ReadingHistoryRoutes };

export async function readingHistoryRoutes(fastify: FastifyInstance) {
  const readingHistoryController = container.resolve<ReadingHistoryController>(
    TOKENS.ReadingHistoryController
  );

  fastify.post(
    ReadingHistoryRoutes.RecordHeartBeat,
    {
      preHandler: [validateAuth],
      schema: {
        description: 'Record heartbeat',
        tags: ['Reading History'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(RecordHeartBeatSchema),
        response: ReadingHistoryResponses.recordHeartBeat,
      },
    },
    readingHistoryController.upsert
  );
}
