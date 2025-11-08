import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env';
import { registerRoutes } from './routes';
import { globalErrorHandler } from './middlewares/errorHandler';
import { clerkPlugin } from '@clerk/fastify';
import 'dotenv/config';

export const createApp = async () => {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(clerkPlugin);

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Register routes
  await registerRoutes(app);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Error handler
  app.setErrorHandler(globalErrorHandler(isDevelopment));

  return app;
};
