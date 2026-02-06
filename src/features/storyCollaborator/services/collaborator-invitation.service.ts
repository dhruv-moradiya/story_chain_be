import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ICollaboratorInvitationService } from './interfaces';
import { IStoryCollaborator } from '../types/storyCollaborator.types';
import { TOKENS } from '@/container/tokens';
import { TStoryCreateInviteLinkDTO } from '@/dto/story.dto';
import { StoryCollaboratorRepository } from '../repositories/storyCollaborator.repository';
import { StoryCollaboratorRole, StoryCollaboratorStatus } from '../types/storyCollaborator-enum';
import { withTransaction } from '@/utils/withTransaction';
import { StoryCollaboratorRules } from '@/domain/storyCollaborator.rules';
import { IStoryCollaboratorUpdateStatusDTO } from '@/dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';
import { NotificationService } from '@features/notification/services/notification.service';
import { StoryRepository } from '@features/story/repositories/story.repository';

@singleton()
class CollaboratorInvitationService extends BaseModule implements ICollaboratorInvitationService {
  constructor(
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly collabRepo: StoryCollaboratorRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  async createInvite(input: TStoryCreateInviteLinkDTO): Promise<IStoryCollaborator> {
    return withTransaction('Creating collaborator invitation', async (session) => {
      // Verify story exists
      const story = await this.storyRepo.findBySlug(input.slug, { session });
      if (!story) {
        this.throwNotFoundError(`Story not found for slug: ${input.slug}`);
      }

      const inviter = await this.collabRepo.findOne(
        {
          slug: input.slug,
          userId: input.inviterUser.id,
          status: StoryCollaboratorStatus.ACCEPTED,
        },
        {},
        { session }
      );

      if (!inviter) {
        this.throwForbiddenError('You do not have permission to send invitations for this story.');
      }

      if (story.creatorId === input.invitedUser.id) {
        this.throwConflictError('The user is already the owner of this story.');
      }

      const existingCollaborator = await this.collabRepo.findOne(
        {
          slug: input.slug,
          userId: input.invitedUser.id,
        },
        {},
        { session }
      );

      if (existingCollaborator) {
        if (existingCollaborator.role === StoryCollaboratorRole.OWNER) {
          this.throwConflictError('The user is already the owner of this story.');
        }
        this.throwConflictError('The user is already a collaborator of this story.');
      }

      if (!StoryCollaboratorRules.ensureInviterHasSufficientRole(inviter.role)) {
        this.throwForbiddenError('Your role does not allow sending collaborator invitations.');
      }

      if (!StoryCollaboratorRules.checkRoleHierarchy(inviter.role, input.role)) {
        this.throwForbiddenError(
          `You cannot assign the role '${input.role}' because it is higher than your current role '${inviter.role}'.`
        );
      }

      const invitation = this.collabRepo.createInvitation(input, { session });

      if (!invitation) {
        this.throwInternalError('Invitation could not be created due to an unexpected error.');
      }

      // TODO: Add in queue
      await this.notificationService.createNotificationForCollabInvitation({
        invitedUser: input.invitedUser,
        inviterUser: input.inviterUser,
        role: input.role,
        story,
      });

      return invitation;
    });
  }

  async updateCollaboratorStatus(
    input: IStoryCollaboratorUpdateStatusDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const { status, userId, slug } = input;

    const updatePayload = {
      status,
      ...(status === StoryCollaboratorStatus.ACCEPTED ? { acceptedAt: Date.now() } : {}),
    };

    const collaborator = await this.collabRepo.findOneAndUpdate(
      { userId, slug },
      updatePayload,
      options
    );

    if (!collaborator) {
      this.throwNotFoundError('Collaborator not found or no update was applied.');
    }

    return collaborator;
  }
}

export { CollaboratorInvitationService };
