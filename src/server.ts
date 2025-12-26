import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

const start = async () => {
  try {
    // Connect to databases
    await connectDB();
    // await connectRedis();

    // Initialize services
    // initializeQueues();
    // await verifyEmailConnection();

    // Create and start app
    const app = await createApp();
    await app.listen({ port: env.PORT });

    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();
