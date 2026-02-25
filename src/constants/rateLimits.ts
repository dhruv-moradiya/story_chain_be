import type { RateLimitOptions } from '@fastify/rate-limit';

export const RateLimits = {
  // Public / read-heavy routes
  PUBLIC_READ: { max: 100, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // Authenticated standard routes
  AUTHENTICATED: { max: 60, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // Standard write operations
  WRITE: { max: 20, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // High-frequency writes (e.g. auto-save)
  FAST_WRITE: { max: 120, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // Sensitive operations (e.g. publishing, invites)
  CRITICAL: { max: 5, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // Content creation (Stories, Chapters, PRs) - Hourly limit
  CREATION_HOURLY: { max: 5, timeWindow: '1 hour' } satisfies RateLimitOptions,

  // Content creation (Stories, Chapters, PRs) - Daily limit
  CREATION_DAILY: { max: 7, timeWindow: '24 hours' } satisfies RateLimitOptions,

  // External webhooks (trusted origins)
  WEBHOOK: { max: 1000, timeWindow: '1 minute' } satisfies RateLimitOptions,

  // Completely disabled
  NONE: false,
} as const;
