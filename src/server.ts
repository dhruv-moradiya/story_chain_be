import { container, TOKENS } from '@container/index';
import { createApp } from './app';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import type { DatabaseService } from '@config/services/database.service';
import type { RedisService } from '@config/services/redis.service';

const bootstrap = async () => {
  // Connect to databases
  const databaseService = container.resolve<DatabaseService>(TOKENS.DatabaseService);
  await databaseService.connect();

  const redisService = container.resolve<RedisService>(TOKENS.RedisService);
  await redisService.connect();

  // Create app
  const app = await createApp();
  return app;
};

// Start server if run directly (CLI, Docker)
if (typeof require !== 'undefined' && require.main === module) {
  bootstrap()
    .then(async (app) => {
      await app.listen({
        port: env.PORT,
        host: env.HOST,
      });

      logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/docs`);
    })
    .catch((error) => {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    });
}

// Export for Serverless (Vercel)
let appInstance: Awaited<ReturnType<typeof createApp>> | undefined;

export default async function handler(req: any, res: any) {
  if (!appInstance) {
    appInstance = await bootstrap();
    await appInstance.ready();
  }
  appInstance.server.emit('request', req, res);
}
