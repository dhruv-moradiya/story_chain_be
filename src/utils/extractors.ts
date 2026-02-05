import { FastifyRequest } from 'fastify';

/**
 * Extract storyId from request params.
 * Checks for 'storyId' or 'id' in params.
 */
export function extractStoryIdFromRequest(request: FastifyRequest): string | undefined {
  const params = request.params as Record<string, string>;
  return params.storyId || params.id;
}

/**
 * Extract slug from request params.
 * Checks for 'slug' in params.
 */
export function extractSlugFromRequest(request: FastifyRequest): string | undefined {
  const params = request.params as Record<string, string>;
  return params.slug || params.storySlug;
}
