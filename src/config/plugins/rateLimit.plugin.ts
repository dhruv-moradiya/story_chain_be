import { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { RedisService } from '@config/services';
import { ApiError } from '@utils/apiResponse';

export const registerRateLimit = async (
  app: FastifyInstance,
  redisService: RedisService
): Promise<void> => {
  await app.register(rateLimit, {
    global: true,
    max: 50,
    timeWindow: '1 minute',
    redis: redisService.getClient(),
    keyGenerator: (request: FastifyRequest): string => {
      // Use authenticated userId if available, fallback to IP
      return request.user?.clerkId ?? request.ip ?? 'unknown';
    },
    errorResponseBuilder: (_request: FastifyRequest, context) => {
      return ApiError.tooManyRequests(
        'RATE_LIMIT_EXCEEDED',
        `You've made too many requests in a short period. Please try again after ${context.after}.`
      );
    },
  });
};
