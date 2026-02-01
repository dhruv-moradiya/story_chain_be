import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { extractStoryIdFromRequest, extractSlugFromRequest } from '@utils/extractors';
import { StoryQueryService } from '@features/story/services/story-query.service';
import { CollaboratorQueryService } from '@features/storyCollaborator/services/collaborator-query.service';
import { StoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator-enum';

// Roles that can write chapters
const WRITE_CHAPTER_ROLES: string[] = [
  StoryCollaboratorRole.OWNER,
  StoryCollaboratorRole.CO_AUTHOR,
  StoryCollaboratorRole.CONTRIBUTOR,
];

// Roles that can edit story settings (including images)
const EDIT_SETTINGS_ROLES: string[] = [
  StoryCollaboratorRole.OWNER,
  StoryCollaboratorRole.CO_AUTHOR,
];

// Roles that can publish stories
const PUBLISH_STORY_ROLES: string[] = [
  StoryCollaboratorRole.OWNER,
  StoryCollaboratorRole.CO_AUTHOR,
];

/**
 * Loads the story context by storyId and attaches story role info to the request.
 * This middleware assumes that the user is already authenticated and user info is attached to request.user.
 *
 * @responsibility
 * - Resolves the story from the database using storyId in request params
 * - Attaches the story context to request.storyContext
 * - Attaches the user's story role to request.userStoryRole
 * - If story not found, responds with 404 and stops request processing.
 */
export async function loadStoryContext(request: FastifyRequest, reply: FastifyReply) {
  const storyId = extractStoryIdFromRequest(request);

  if (!storyId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story ID is required in the request.',
    });
  }

  const storyQueryService = container.resolve<StoryQueryService>(TOKENS.StoryQueryService);
  const collaboratorQueryService = container.resolve<CollaboratorQueryService>(
    TOKENS.CollaboratorQueryService
  );

  try {
    const story = await storyQueryService.getById(storyId);

    request.storyContext = {
      storyId: story._id.toString(),
      creatorId: story.creatorId,
      status: story.status,
    };

    if (request.user) {
      const userId = request.user.clerkId;
      request.userStoryRole = await collaboratorQueryService.getCollaboratorRole(
        userId,
        story.slug
      );
    } else {
      request.userStoryRole = null;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
        success: false,
        error: 'Not Found',
        message: 'Story not found.',
      });
    }
    throw error;
  }
}

/**
 * Loads the story context by slug and attaches story role info to the request.
 * This middleware assumes that the user is already authenticated and user info is attached to request.user.
 *
 * @responsibility
 * - Resolves the story from the database using slug in request params
 * - Attaches the story context to request.storyContext
 * - Attaches the user's story role to request.userStoryRole
 * - If story not found, responds with 404 and stops request processing.
 */
export async function loadStoryContextBySlug(request: FastifyRequest, reply: FastifyReply) {
  const slug = extractSlugFromRequest(request);

  if (!slug) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story slug is required in the request.',
    });
  }

  const storyQueryService = container.resolve<StoryQueryService>(TOKENS.StoryQueryService);
  const collaboratorQueryService = container.resolve<CollaboratorQueryService>(
    TOKENS.CollaboratorQueryService
  );

  try {
    const story = await storyQueryService.getBySlug(slug);

    request.storyContext = {
      storyId: story._id.toString(),
      creatorId: story.creatorId,
      status: story.status,
    };

    if (request.user) {
      const userId = request.user.clerkId;
      request.userStoryRole = await collaboratorQueryService.getCollaboratorRole(
        userId,
        story._id.toString()
      );
    } else {
      request.userStoryRole = null;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
        success: false,
        error: 'Not Found',
        message: 'Story not found.',
      });
    }
    throw error;
  }
}

/**
 * Story role guard functions for RBAC.
 * These middlewares check if the user has the required role to perform an action.
 * They must be used AFTER loadStoryContext or loadStoryContextBySlug middleware.
 */
export const StoryRoleGuards = {
  /**
   * Checks if the user can write chapters.
   * Allowed roles: OWNER, CO_OWNER, CONTRIBUTOR
   */
  canWriteChapters: async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.userStoryRole;

    if (!userRole || !WRITE_CHAPTER_ROLES.includes(userRole)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to write chapters for this story.',
      });
    }
  },

  /**
   * Checks if the user can edit story settings (including cover/card images).
   * Allowed roles: OWNER, CO_AUTHOR
   */
  canEditStorySettings: async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.userStoryRole;

    if (!userRole || !EDIT_SETTINGS_ROLES.includes(userRole)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to edit settings for this story.',
      });
    }
  },

  /**
   * Checks if the user can publish the story.
   * Allowed roles: OWNER, CO_AUTHOR
   */
  canPublishStory: async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.userStoryRole;

    if (!userRole || !PUBLISH_STORY_ROLES.includes(userRole)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to publish this story.',
      });
    }
  },
};
