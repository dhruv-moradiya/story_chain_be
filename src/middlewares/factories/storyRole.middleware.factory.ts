import { FastifyRequest, FastifyReply } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { extractStoryIdFromRequest, extractSlugFromRequest } from '@utils/extractors';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';

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
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {}

  /**
   * Creates middleware to load story context by storyId.
   * Attaches storyContext and userStoryRole to the request.
   */
  createLoadContextById() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const storyId = extractStoryIdFromRequest(request);

      if (!storyId) {
        return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
          success: false,
          error: 'Bad Request',
          message: 'Story ID is required in the request.',
        });
      }

      try {
        const story = await this.storyQueryService.getById(storyId);

        request.storyContext = {
          storyId: story._id.toString(),
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
        return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
          success: false,
          error: 'Bad Request',
          message: 'Story slug is required in the request.',
        });
      }

      try {
        const story = await this.storyQueryService.getBySlug(slug);

        request.storyContext = {
          storyId: story._id.toString(),
          creatorId: story.creatorId,
          status: story.status,
        };

        if (request.user) {
          request.userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
            request.user.clerkId,
            story._id.toString()
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
}
