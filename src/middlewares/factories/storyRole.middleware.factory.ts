import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
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
} from '@features/storyCollaborator/types/storyCollaborator-enum';
import {
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator.types';

export interface StoryRoleMiddlewareOptions {
  allowPlatformOverride?: boolean;
}

@singleton()
export class StoryRoleMiddlewareFactory {
  constructor(
    @inject(TOKENS.StoryService)
    private readonly storyService: StoryService,
    @inject(TOKENS.StoryCollaboratorService)
    private readonly storyCollaboratorService: StoryCollaboratorService
  ) {}

  /**
   * Creates middleware to load story context by ID
   */
  createLoadContextById() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { storyId } = request.params as { storyId: string };

      if (!storyId) {
        return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
          success: false,
          error: 'Bad Request',
          message: 'Story ID is required.',
        });
      }

      const story = await this.storyService.getStoryById(storyId);

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
        request.userStoryRole = await this.storyCollaboratorService.getCollaboratorRole(
          request.user.clerkId,
          storyId
        );
      } else {
        request.userStoryRole = null;
      }
    };
  }

  /**
   * Creates middleware to load story context by slug
   */
  createLoadContextBySlug() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { slug } = request.params as { slug: string };

      if (!slug) {
        return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
          success: false,
          error: 'Bad Request',
          message: 'Story slug is required.',
        });
      }

      const story = await this.storyService.getStoryBySlug(slug);

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
        request.userStoryRole = await this.storyCollaboratorService.getCollaboratorRole(
          request.user.clerkId,
          story._id.toString()
        );
      } else {
        request.userStoryRole = null;
      }
    };
  }

  /**
   * Creates middleware requiring minimum story role
   */
  createRequireRole(minimumRole: TStoryCollaboratorRole, options: StoryRoleMiddlewareOptions = {}) {
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

  /**
   * Creates middleware requiring specific story permission
   */
  createRequirePermission(
    permission: TStoryCollaboratorPermission,
    options: StoryRoleMiddlewareOptions = {}
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

  /**
   * Pre-built guards for common use cases
   */
  createGuards() {
    return {
      loadContext: this.createLoadContextById(),
      loadContextBySlug: this.createLoadContextBySlug(),

      // Role guards
      owner: this.createRequireRole(StoryCollaboratorRole.OWNER),
      coAuthor: this.createRequireRole(StoryCollaboratorRole.CO_AUTHOR),
      moderator: this.createRequireRole(StoryCollaboratorRole.MODERATOR),
      reviewer: this.createRequireRole(StoryCollaboratorRole.REVIEWER),
      contributor: this.createRequireRole(StoryCollaboratorRole.CONTRIBUTOR),

      // Permission guards
      canWriteChapters: this.createRequirePermission('canWriteChapters'),
      canApprovePRs: this.createRequirePermission('canApprovePRs'),
      canRejectPRs: this.createRequirePermission('canRejectPRs'),
      canMergePRs: this.createRequirePermission('canMergePRs'),
      canReviewPRs: this.createRequirePermission('canReviewPRs'),
      canModerateComments: this.createRequirePermission('canModerateComments'),
      canDeleteComments: this.createRequirePermission('canDeleteComments'),
      canEditSettings: this.createRequirePermission('canEditStorySettings'),
      canDeleteStory: this.createRequirePermission('canDeleteStory'),
      canInvite: this.createRequirePermission('canInviteCollaborators'),
      canRemoveCollaborators: this.createRequirePermission('canRemoveCollaborators'),
      canBanFromStory: this.createRequirePermission('canBanFromStory'),
    };
  }
}
