import { ApiError } from '@/utils/apiResponse';
import { logger } from '@/utils/logger';
import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { StoryBanRepository } from '@features/storyBan/repositories/storyBan.repository';
import { extractSlugFromRequest } from '@utils/extractors';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';

/**
 * Factory class for creating story role middlewares.
 * Uses dependency injection to resolve required services.
 */
@singleton()
export class StoryRoleMiddlewareFactory {
  constructor(
    @inject(TOKENS.StoryQueryService)
    private readonly storyQueryService: StoryQueryService,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.StoryBanRepository)
    private readonly storyBanRepository: StoryBanRepository
  ) {}

  /**
   * Creates middleware to check if the current user is banned from the story.
   * Responds with 403 FORBIDDEN if the user is banned.
   */
  createCheckStoryBan() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const slug = extractSlugFromRequest(request);

      if (!slug) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST.code)
          .send(ApiError.badRequest('Story slug is required in params.'));
      }

      if (request.user) {
        const activeBan = await this.storyBanRepository.findActiveBan(slug, request.user.clerkId);

        if (activeBan) {
          return reply
            .code(HTTP_STATUS.FORBIDDEN.code)
            .send(ApiError.forbidden('You have been banned from accessing this story.'));
        }
      }
    };
  }

  /**
   * Creates middleware to load story context by storyId.
   * Attaches storyContext and userStoryRole to the request.
   */
  createLoadContextById() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const storySlug = extractSlugFromRequest(request);

      if (!storySlug) {
        return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
          success: false,
          error: 'Bad Request',
          message: 'Story ID is required in the request.',
        });
      }

      try {
        const story = await this.storyQueryService.getBySlug(storySlug);

        request.storyContext = {
          storySlug: story.slug,
          creatorId: story.creatorId,
          status: story.status,
        };

        if (request.user) {
          request.userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
            request.user.clerkId,
            story.slug
          );
        } else {
          request.userStoryRole = null;
        }
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          error.statusCode === 404
        ) {
          return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
            success: false,
            error: 'Not Found',
            message: 'Story not found.',
          });
        }
        throw error;
      }
    };
  }

  /**
   * Creates middleware to load story context by slug.
   * Attaches storyContext and userStoryRole to the request.
   */
  createLoadContextBySlug() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const slug = extractSlugFromRequest(request);

      if (!slug) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST.code)
          .send(ApiError.badRequest('Story slug is required in params.'));
      }

      try {
        const story = await this.storyQueryService.getBySlug(slug);

        request.storyContext = {
          storySlug: story.slug,
          creatorId: story.creatorId,
          status: story.status,
        };

        if (request.user) {
          request.userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
            request.user.clerkId,
            story.slug
          );
        } else {
          request.userStoryRole = null;
        }
      } catch (error: unknown) {
        logger.error(`Error loading story context for slug: ${slug}`, { error });
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          error.statusCode === 404
        ) {
          return reply.code(HTTP_STATUS.NOT_FOUND.code).send(ApiError.notFound('Story not found.'));
        }
        throw error;
      }
    };
  }
}
