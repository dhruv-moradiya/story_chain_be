import { FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { storyCollaboratorService } from '../../features/storyCollaborator/storyCollaborator.service';
import { storyService } from '../../features/story/story.service';
import {
  StoryCollaboratorRole,
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '../../features/storyCollaborator/storyCollaborator.types';
import { PlatformRoleRules } from '../../domain/platformRole.rules';
import { PlatformRole } from '../../features/platformRole/platformRole.types';
import { STORY_ROLES } from '../../constants';
import { StoryCollaboratorRules } from '../../domain/storyCollaborator.rules';

async function loadStoryContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { storyId } = request.params as { storyId: string };

  if (!storyId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story ID is required.',
    });
  }

  const story = await storyService.getStoryById(storyId);

  if (!story) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Story not found.',
    });
  }

  // Build story context
  request.storyContext = {
    storyId: story._id.toString(),
    creatorId: story.creatorId,
    status: story.status,
  };

  // Get user's role in this story
  if (request.user) {
    const userId = request.user.clerkId;
    request.userStoryRole = await storyCollaboratorService.getCollaboratorRole(userId, storyId);
  } else {
    request.userStoryRole = null;
  }
}

async function loadStoryContextBySlug(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { slug } = request.params as { slug: string };

  if (!slug) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story slug is required.',
    });
  }

  const story = await storyService.getStoryBySlug(slug);

  if (!story) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Story not found.',
    });
  }

  // Build story context
  request.storyContext = {
    storyId: story._id.toString(),
    creatorId: story.creatorId,
    status: story.status,
  };

  // Get user's role in this story
  if (request.user) {
    const userId = request.user.clerkId;
    request.userStoryRole = await storyCollaboratorService.getCollaboratorRole(
      userId,
      story._id.toString()
    );
  } else {
    request.userStoryRole = null;
  }
}

function requireStoryRole(
  minimumRole: TStoryCollaboratorRole,
  options: { allowPlatformOverride?: boolean } = {}
) {
  const { allowPlatformOverride = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    const userStoryRole = request.userStoryRole;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    if (allowPlatformOverride) {
      const platformRole = user.role as PlatformRole;
      if (
        PlatformRoleRules.hasPermission(platformRole, 'canDeleteAnyContent') ||
        platformRole === PlatformRole.SUPER_ADMIN
      ) {
        return;
      }
    }

    // Check story role
    if (!userStoryRole) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You are not a collaborator on this story.',
      });
    }

    if (!StoryCollaboratorRules.hasMinimumStoryRole(userStoryRole, minimumRole)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `This action requires ${STORY_ROLES[minimumRole]?.name || minimumRole} role or higher.`,
        requiredRole: minimumRole,
        yourRole: userStoryRole,
      });
    }
  };
}

function requireStoryPermission(
  permission: TStoryCollaboratorPermission,
  options: { allowPlatformOverride?: boolean } = {}
) {
  const { allowPlatformOverride = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    const userStoryRole = request.userStoryRole;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    // Check platform override
    if (allowPlatformOverride) {
      const platformRole = user.role as PlatformRole;
      if (
        PlatformRoleRules.hasPermission(platformRole, 'canDeleteAnyContent') ||
        platformRole === PlatformRole.SUPER_ADMIN
      ) {
        return; // Allow access
      }
    }

    // No role in story
    if (!userStoryRole) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You are not a collaborator on this story.',
        requiredPermission: permission,
      });
    }

    // Check permission
    if (!StoryCollaboratorRules.hasStoryPermission(userStoryRole, permission)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `Your role (${STORY_ROLES[userStoryRole]?.name || userStoryRole}) does not have permission to perform this action.`,
        requiredPermission: permission,
        yourRole: userStoryRole,
      });
    }
  };
}

const StoryRoleGuards = {
  /**
   * Load story context (required before other guards)
   */
  loadContext: loadStoryContext,

  /**
   * Load optional story context
   */
  // loadOptionalContext: loadOptionalStoryContext,

  /**
   * Require OWNER role
   */
  owner: requireStoryRole(StoryCollaboratorRole.OWNER),

  /**
   * Require CO_AUTHOR or higher
   */
  coAuthor: requireStoryRole(StoryCollaboratorRole.CO_AUTHOR),

  /**
   * Require MODERATOR or higher
   */
  moderator: requireStoryRole(StoryCollaboratorRole.MODERATOR),

  /**
   * Require REVIEWER or higher
   */
  reviewer: requireStoryRole(StoryCollaboratorRole.REVIEWER),

  /**
   * Require CONTRIBUTOR or higher (any collaborator)
   */
  contributor: requireStoryRole(StoryCollaboratorRole.CONTRIBUTOR),

  /**
   * Can write chapters
   */
  canWriteChapters: requireStoryPermission('canWriteChapters'),

  /**
   * Can approve PRs
   */
  canApprovePRs: requireStoryPermission('canApprovePRs'),

  /**
   * Can reject PRs
   */
  canRejectPRs: requireStoryPermission('canRejectPRs'),

  /**
   * Can merge PRs
   */
  canMergePRs: requireStoryPermission('canMergePRs'),

  /**
   * Can review PRs (comment)
   */
  canReviewPRs: requireStoryPermission('canReviewPRs'),

  /**
   * Can moderate comments
   */
  canModerateComments: requireStoryPermission('canModerateComments'),

  /**
   * Can delete comments
   */
  canDeleteComments: requireStoryPermission('canDeleteComments'),

  /**
   * Can edit story settings
   */
  canEditSettings: requireStoryPermission('canEditStorySettings'),

  /**
   * Can delete story
   */
  canDeleteStory: requireStoryPermission('canDeleteStory'),

  /**
   * Can invite collaborators
   */
  canInvite: requireStoryPermission('canInviteCollaborators'),

  /**
   * Can remove collaborators
   */
  canRemoveCollaborators: requireStoryPermission('canRemoveCollaborators'),

  /**
   * Can ban users from story
   */
  canBanFromStory: requireStoryPermission('canBanFromStory'),
};

export {
  loadStoryContext,
  loadStoryContextBySlug,
  requireStoryRole,
  requireStoryPermission,
  StoryRoleGuards,
};
