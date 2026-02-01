import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import { TStoryCreateInviteLinkSchema, TStorySlugSchema } from '@schema/request/story.schema';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';

// Import collaborator focused services
import { CollaboratorQueryService } from '../services/collaborator-query.service';
import { CollaboratorInvitationService } from '../services/collaborator-invitation.service';
import { StoryCollaboratorStatus } from '../types/storyCollaborator-enum';

@singleton()
export class StoryCollaboratorController extends BaseModule {
  constructor(
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService,
    @inject(TOKENS.CollaboratorInvitationService)
    private readonly collaboratorInvitationService: CollaboratorInvitationService
  ) {
    super();
  }

  // =====================
  // COLLABORATOR OPERATIONS
  // =====================

  // Get story collaborators by slug
  getStoryCollaboratorsBySlug = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;

      const collaborators = await this.collaboratorQueryService.getCollaboratorsByStorySlug({
        slug,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          new ApiResponse(
            true,
            collaborators.length === 0
              ? `No collaborators found for this story.`
              : `${collaborators.length} user${collaborators.length > 1 ? 's' : ''} found.`,
            collaborators
          )
        );
    }
  );

  // Create invitation by slug
  createInvitationBySlug = catchAsync(
    async (
      request: FastifyRequest<{ Params: TStorySlugSchema; Body: TStoryCreateInviteLinkSchema }>,
      reply: FastifyReply
    ) => {
      const { clerkId: userId, username } = request.user;
      const { slug } = request.params;
      const { role, invitedUserId, invitedUserName } = request.body;

      const invitation = await this.collaboratorInvitationService.createInvite({
        slug,
        role,
        invitedUser: {
          id: invitedUserId,
          name: invitedUserName,
        },
        inviterUser: {
          id: userId,
          name: username,
        },
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(new ApiResponse(true, 'Invitation created successfully', invitation));
    }
  );

  acceptInvitation = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const result = await this.collaboratorInvitationService.updateCollaboratorStatus({
        slug,
        userId,
        status: StoryCollaboratorStatus.ACCEPTED,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Invitation accepted successfully', result));
    }
  );

  declineInvitation = catchAsync(
    async (request: FastifyRequest<{ Params: TStorySlugSchema }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const { clerkId: userId } = request.user;

      const result = await this.collaboratorInvitationService.updateCollaboratorStatus({
        slug,
        userId,
        status: StoryCollaboratorStatus.DECLINED,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, 'Invitation declined successfully', result));
    }
  );
}
