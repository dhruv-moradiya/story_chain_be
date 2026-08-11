// Test commit - This is a test change for practicing git workflow
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from '@config/env';
import { registerRoutes } from '@routes/index';
import { globalErrorHandler } from '@middleware/errorHandler';
import { clerkPlugin } from '@clerk/fastify';
import 'dotenv/config';
import { container } from 'tsyringe';
import { RedisService } from './config/services';
import { TOKENS } from './container';
import fastifyMetrics from 'fastify-metrics';
import { FastifyAdapter } from '@bull-board/fastify';
import { createBullBoard } from '@bull-board/api';
import { QUEUE_NAMES, QueueService } from './infrastructure';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { bootstrapSchedulers, bootstrapWorkers } from './infrastructure/queue/worker.bootstrap';
import { GamificationEventListener } from './infrastructure/events';
import { registerRateLimit, registerSwagger } from './config/plugins';
import { logger } from './utils/logger';

export const createApp = async () => {
  const redisService = container.resolve<RedisService>(TOKENS.RedisService);
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);

  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    trustProxy: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });
  await app.register(helmet);
  await app.register(clerkPlugin);
  await app.register(fastifyMetrics);

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = [
    QUEUE_NAMES.CHAPTER_COMMENT_VOTE,
    QUEUE_NAMES.EMAIL,
    QUEUE_NAMES.NOTIFICATION,
    QUEUE_NAMES.FAKE_HEAVY,
  ].map((name) => new BullMQAdapter(queueService.getQueue(name)));

  createBullBoard({
    queues,
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'StoryChain Queues',
      },
    },
  });

  // Register extracted plugin modules
  await registerRateLimit(app, redisService);
  await registerSwagger(app);

  logger.info('[APP]: Flushing Redis cache');
  await redisService.flush();
  logger.info('[APP]: Redis cache flushed');

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Register routes
  await registerRoutes(app);

  await bootstrapSchedulers();

  bootstrapWorkers();

  GamificationEventListener.initialize();

  await app.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
  });

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Error handler
  app.setErrorHandler(globalErrorHandler(isDevelopment));

  return app;
};
