import { FastifyReply, FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { PlatformRoleRules } from '@domain/platformRole.rules';
import { StoryCollaboratorRules } from '@domain/storyCollaborator.rules';
import { PlatformRole } from '@features/platformRole/types/platformRole.types';
import { StoryService } from '@features/story/services/story.service';
import { StoryCollaboratorService } from '@features/storyCollaborator/services/storyCollaborator.service';
import {
  STORY_COLLABORATOR_ROLE_CONFIG,
  StoryCollaboratorRole,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';
import {
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator.types';

/**
 * Load story context by ID - uses DI to resolve services
 */
async function loadStoryContext(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { storyId } = request.params as { storyId: string };

  if (!storyId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story ID is required.',
    });
  }

  const storyService = container.resolve<StoryService>(TOKENS.StoryService);
  const storyCollaboratorService = container.resolve<StoryCollaboratorService>(
    TOKENS.StoryCollaboratorService
  );

  const story = await storyService.getStoryById(storyId);

  if (!story) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Story not found.',
    });
  }

  request.storyContext = {
    storyId: story._id.toString(),
    creatorId: story.creatorId,
    status: story.status,
  };

  if (request.user) {
    const userId = request.user.clerkId;
    request.userStoryRole = await storyCollaboratorService.getCollaboratorRole(userId, storyId);
  } else {
    request.userStoryRole = null;
  }
}

/**
 * Load story context by slug - uses DI to resolve services
 */
async function loadStoryContextBySlug(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { slug } = request.params as { slug: string };

  if (!slug) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story slug is required.',
    });
  }

  const storyService = container.resolve<StoryService>(TOKENS.StoryService);
  const storyCollaboratorService = container.resolve<StoryCollaboratorService>(
    TOKENS.StoryCollaboratorService
  );

  const story = await storyService.getStoryBySlug(slug);

  if (!story) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Story not found.',
    });
  }

  request.storyContext = {
    storyId: story._id.toString(),
    creatorId: story.creatorId,
    status: story.status,
  };

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
        message: `This action requires ${STORY_COLLABORATOR_ROLE_CONFIG[minimumRole]?.name || minimumRole} role or higher.`,
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

    if (allowPlatformOverride) {
      const platformRole = user.role as PlatformRole;
      if (
        PlatformRoleRules.hasPermission(platformRole, 'canDeleteAnyContent') ||
        platformRole === PlatformRole.SUPER_ADMIN
      ) {
        return;
      }
    }

    if (!userStoryRole) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You are not a collaborator on this story.',
        requiredPermission: permission,
      });
    }

    if (!StoryCollaboratorRules.hasStoryPermission(userStoryRole, permission)) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `Your role (${STORY_COLLABORATOR_ROLE_CONFIG[userStoryRole]?.name || userStoryRole}) does not have permission to perform this action.`,
        requiredPermission: permission,
        yourRole: userStoryRole,
      });
    }
  };
}

const StoryRoleGuards = {
  loadContext: loadStoryContext,

  // Role guards
  owner: requireStoryRole(StoryCollaboratorRole.OWNER),
  coAuthor: requireStoryRole(StoryCollaboratorRole.CO_AUTHOR),
  moderator: requireStoryRole(StoryCollaboratorRole.MODERATOR),
  reviewer: requireStoryRole(StoryCollaboratorRole.REVIEWER),
  contributor: requireStoryRole(StoryCollaboratorRole.CONTRIBUTOR),

  // Permission guards
  canWriteChapters: requireStoryPermission('canWriteChapters'),
  canApprovePRs: requireStoryPermission('canApprovePRs'),
  canRejectPRs: requireStoryPermission('canRejectPRs'),
  canMergePRs: requireStoryPermission('canMergePRs'),
  canReviewPRs: requireStoryPermission('canReviewPRs'),
  canModerateComments: requireStoryPermission('canModerateComments'),
  canDeleteComments: requireStoryPermission('canDeleteComments'),
  canEditSettings: requireStoryPermission('canEditStorySettings'),
  canDeleteStory: requireStoryPermission('canDeleteStory'),
  canInvite: requireStoryPermission('canInviteCollaborators'),
  canRemoveCollaborators: requireStoryPermission('canRemoveCollaborators'),
  canBanFromStory: requireStoryPermission('canBanFromStory'),
};

export {
  loadStoryContext,
  loadStoryContextBySlug,
  requireStoryRole,
  requireStoryPermission,
  StoryRoleGuards,
};
