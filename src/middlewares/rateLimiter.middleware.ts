import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { ApiError } from '@/utils/apiResponse';
import { RedisService } from '@/config/services/redis.service';
import { TOKENS } from '@/container';

const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per window

export const rateLimiter = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = request.user?.clerkId || request.ip;
  const key = `rate_limit:${userId}`;

  // Resolve RedisService using the token registered in registry.ts
  const redisService = container.resolve<RedisService>(TOKENS.RedisService);

  const currentCount = await redisService.incr(key);

  if (currentCount === 1) {
    await redisService.expire(key, RATE_LIMIT_WINDOW);
  }

  if (currentCount > MAX_REQUESTS) {
    return reply
      .code(HTTP_STATUS.TOO_MANY_REQUESTS.code)
      .send(
        ApiError.tooManyRequests('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later')
      );
  }
};
