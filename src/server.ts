import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { connectRedis } from './config/redis';

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

    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();
