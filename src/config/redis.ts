// import Redis from 'ioredis';
// import { env } from './env';
// import { logger } from '@utils/logger';

// let redisClient: Redis | null = null;

// export const connectRedis = async (): Promise<void> => {
//   try {
//     redisClient = new Redis(env.REDIS_URL, {
//       maxRetriesPerRequest: 3,
//       retryStrategy(times) {
//         const delay = Math.min(times * 50, 2000);
//         return delay;
//       },
//     });

//     redisClient.on('connect', () => {
//       logger.info('✅ Redis Connected');
//     });

//     redisClient.on('error', (err) => {
//       logger.error('Redis connection error:', err);
//     });

//     redisClient.on('reconnecting', () => {
//       logger.info('Redis reconnecting...');
//     });

//     await redisClient.ping();
//   } catch (error) {
//     logger.error('Failed to connect to Redis:', error);
//     throw error;
//   }
// };

// export const getRedisClient = (): Redis => {
//   if (!redisClient) {
//     throw new Error('Redis client not initialized');
//   }
//   return redisClient;
// };
