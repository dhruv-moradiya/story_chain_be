import { container, TOKENS } from '@container/index';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import type { DatabaseService } from '@config/services/database.service';
import type { RedisService } from '@config/services/redis.service';

const start = async () => {
  try {
    // Connect to databases
    // await connectDB();le

    // const databaseService = container.resolve(DatabaseService);
    const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
    await databaseService.connect();

    // await connectRedis();
    const redisService = container.resolve<RedisService>(TOKENS.RedisService);
    await redisService.connect();

    // Initialize services
    // initializeQueues();
    // await verifyEmailConnection();

    // Create and start app
    const app = await createApp();
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();
