import { STORY_ROLES } from '../../constants';
import { StoryCollaboratorRules } from '../../domain/storyCollaborator.rules';
import {
  IGetAllStoryMembers,
  IStoryCollaboratorCreateDTO,
  IStoryCollaboratorInvitationDTO,
  IStoryCollaboratorUpdateStatusDTO,
} from '../../dto/storyCollaborator.dto';
import { ID, IOperationOptions } from '../../types';
import { BaseModule } from '../../utils/baseClass';
import { NotificationService } from '../notification/notification.service';
import { StoryRepository } from '../story/repository/story.repository';
import { IStory } from '../story/story.types';
import { StoryCollaboratorPipelineBuilder } from './pipelines/storyCollaborator.pipeline';
import { StoryCollaboratorRepository } from './repository/storyCollaborator.repository';
import {
  IStoryCollaborator,
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
  TStoryCollaboratorRole,
} from './storyCollaborator.types';

export class StoryCollaboratorService extends BaseModule {
  private readonly storyRepo = new StoryRepository();
  private readonly storyCollaboratorRepo = new StoryCollaboratorRepository();
  private readonly notificationService = new NotificationService();

  protected async ensureStoryExists(
    storyId: ID,
    repo: StoryRepository,
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const story = await repo.findById(storyId, {}, options);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  protected async getStoryCollaboratos(
    input: IGetAllStoryMembers,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator[]> {
    await this.ensureStoryExists(input.storyId, this.storyRepo, options);

    const members = await this.storyCollaboratorRepo.findStoryCollaborators(input.storyId);

    if (!members) {
      this.throwNotFoundError('No collaborators found for this story');
    }

    return members;
  }

  async createCollaborator(
    input: IStoryCollaboratorCreateDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const { userId, role, storyId, status } = input;

    await this.ensureStoryExists(storyId, this.storyRepo, options);

    const collaborator = await this.storyCollaboratorRepo.create({
      storyId,
      role,
      userId,
      ...(status ? { status } : {}),
    });

    if (!collaborator) {
      this.throwInternalError('Collaborator could not be created due to an unexpected error.');
    }

    return collaborator;
  }

  async inviteCollaborator(
    input: IStoryCollaboratorInvitationDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const story = await this.ensureStoryExists(input.storyId, this.storyRepo, options);

    const inviter = await this.storyCollaboratorRepo.findOne(
      {
        storyId: input.storyId,
        userId: input.inviterUser.id,
        status: StoryCollaboratorStatus.ACCEPTED,
      },
      {},
      { session: options.session }
    );

    if (!inviter) {
      throw new Error('You do not have permission to send invitations for this story.');
    }

    const storyCollaborators = await this.getStoryCollaboratos({ storyId: input.storyId });

    if (
      !StoryCollaboratorRules.isInvitorIsCollaboratorOfStory(
        input.inviterUser.id,
        storyCollaborators
      )
    ) {
      this.throwForbiddenError('You must be a collaborator of this story to send invitations.');
    }

    if (!StoryCollaboratorRules.ensureInviterHasSufficientRole(inviter.role)) {
      this.throwForbiddenError('Your role does not allow sending collaborator invitations.');
    }

    if (!StoryCollaboratorRules.checkRoleHierarchy(inviter.role, input.role)) {
      this.throwForbiddenError(
        `You cannot assign the role '${input.role}' because it is higher than your current role '${inviter.role}'.`
      );
    }

    const invitation = this.storyCollaboratorRepo.createInvitation(input, options);

    // TODO: Add in queue
    await this.notificationService.createNotificationForCollabInvitation({
      invitedUser: input.invitedUser,
      inviterUser: input.inviterUser,
      role: input.role,
      story,
    });

    if (!invitation) {
      this.throwInternalError('Invitation could not be created due to an unexpected error.');
    }

    return invitation;
  }

  async updateCollaboratorStatus(
    input: IStoryCollaboratorUpdateStatusDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const { status, userId, stotyId } = input;

    const updatePayload = {
      status,
      ...(status === StoryCollaboratorStatus.ACCEPTED ? { acceptedAt: Date.now() } : {}),
    };

    const collaborator = await this.storyCollaboratorRepo.findOneAndUpdate(
      { userId, stotyId },
      updatePayload,
      options
    );

    if (!collaborator) {
      this.throwNotFoundError('Collaborator not found or no update was applied.');
    }

    return collaborator;
  }

  async getAllStoryMembers(
    input: IGetAllStoryMembers,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator[]> {
    await this.ensureStoryExists(input.storyId, this.storyRepo, options);

    const pipeline = new StoryCollaboratorPipelineBuilder()
      .allCollaboratorDetails(input.storyId)
      .build();

    const members = await this.storyCollaboratorRepo.aggregateStories(pipeline);

    if (!members) {
      this.throwNotFoundError('No collaborators found for this story');
    }

    return members;
  }

  async getCollaboratorRole(
    userId: string,
    storyId: ID,
    options: IOperationOptions = {}
  ): Promise<TStoryCollaboratorRole | null> {
    const story = await this.ensureStoryExists(storyId, this.storyRepo, options);

    if (story.creatorId === userId) {
      return StoryCollaboratorRole.OWNER;
    }

    const collaborator = await this.storyCollaboratorRepo.findOne({
      storyId,
      userId,
      status: StoryCollaboratorStatus.ACCEPTED,
    });

    if (collaborator) {
      return collaborator.role;
    }

    return null;
  }
}

export const storyCollaboratorService = new StoryCollaboratorService();
