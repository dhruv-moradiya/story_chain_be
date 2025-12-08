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
import { StoryRepository } from '../story/repository/story.repository';
import { StoryCollaboratorPipelineBuilder } from './pipelines/storyCollaborator.pipeline';
import { StoryCollaboratorRepository } from './repository/storyCollaborator.repository';
import { IStoryCollaborator, StoryCollaboratorStatus } from './storyCollaborator.types';

export class StoryCollaboratorSerice extends BaseModule {
  private readonly storyRepo = new StoryRepository();
  private readonly storyCollaboratorRepo = new StoryCollaboratorRepository();

  protected async ensureStoryExists(storyId: ID, repo: any, options = {}) {
    const story = await repo.findById(storyId, {}, options);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
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
    await this.ensureStoryExists(input.storyId, this.storyRepo, options);

    const inviter = await this.storyCollaboratorRepo.findOne(
      {
        storyId: input.storyId,
        userId: input.inviterUserId,
        status: StoryCollaboratorStatus.ACCEPTED,
      },
      {},
      { session: options.session }
    );

    if (!inviter) {
      throw new Error('You do not have permission to send invitations for this story.');
    }

    const storyCollaborators = await this.getAllStoryMembers({ storyId: input.storyId });

    if (
      !StoryCollaboratorRules.isInvitorIsCollaboratorOfStory(
        input.inviterUserId,
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
}
