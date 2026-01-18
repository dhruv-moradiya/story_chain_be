import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { StoryCollaboratorRules } from '@domain/storyCollaborator.rules';
import {
  IGetAllStoryMembersBySlugDTO,
  IStoryCollaboratorCreateDTO,
  IStoryCollaboratorInvitationDTO,
  IStoryCollaboratorUpdateStatusDTO,
} from '@dto/storyCollaborator.dto';
import { ID, IOperationOptions } from '@/types';
import { IStoryCollaboratorDetailsResponse } from '@/types/response/story.response.types';
import { BaseModule } from '@utils/baseClass';
import { NotificationService } from '@features/notification/services/notification.service';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { IStory } from '@features/story/types/story.types';
import { StoryCollaboratorPipelineBuilder } from '../pipelines/storyCollaborator.pipeline';
import { StoryCollaboratorRepository } from '../repositories/storyCollaborator.repository';
import { IStoryCollaborator, TStoryCollaboratorRole } from '../types/storyCollaborator.types';
import { StoryCollaboratorRole, StoryCollaboratorStatus } from '../types/storyCollaborator-enum';

@singleton()
export class StoryCollaboratorService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly storyCollaboratorRepo: StoryCollaboratorRepository,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  private getStoryMembersIds(collaborators: IStoryCollaboratorDetailsResponse[]): string[] {
    return collaborators.map((collaborator) => collaborator.user.clerkId);
  }

  protected async ensureStoryExistsById(
    storyId: ID,
    repo: StoryRepository,
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const story = await repo.findById(storyId, {}, options);

    if (!story) {
      this.throwNotFoundError(`Story not found for ID: ${storyId}`);
    }

    return story;
  }

  protected async ensureStoryExistsBySlug(
    slug: string,
    repo: StoryRepository,
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const story = await repo.findOne({ slug }, {}, options);

    if (!story) {
      this.throwNotFoundError(`Story not found for slug: ${slug}`);
    }

    return story;
  }

  async createCollaborator(
    input: IStoryCollaboratorCreateDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const { userId, role, slug, status } = input;

    await this.ensureStoryExistsBySlug(slug, this.storyRepo, options);

    const collaborator = await this.storyCollaboratorRepo.create({
      slug,
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
    const story = await this.ensureStoryExistsBySlug(input.slug, this.storyRepo, options);

    const inviter = await this.storyCollaboratorRepo.findOne(
      {
        slug: input.slug,
        userId: input.inviterUser.id,
        status: StoryCollaboratorStatus.ACCEPTED,
      },
      {},
      { session: options.session }
    );

    if (!inviter) {
      this.throwForbiddenError('You do not have permission to send invitations for this story.');
    }

    const storyCollaborators = await this.getAllStoryMemberDetailsBySlug({ slug: input.slug });

    if (
      storyCollaborators
        .filter((c) => c.role === StoryCollaboratorRole.OWNER)
        .some((owner) => owner.user.clerkId === input.invitedUser.id)
    ) {
      this.throwConflictError('The user is already the owner of this story.');
    }

    if (storyCollaborators.filter((c) => c.user.clerkId === input.invitedUser.id).length > 0) {
      this.throwConflictError('The user is already a collaborator of this story.');
    }

    const storyMemberIds = this.getStoryMembersIds(storyCollaborators);

    if (
      !StoryCollaboratorRules.isInvitorIsCollaboratorOfStory(input.inviterUser.id, storyMemberIds)
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
    const { status, userId, slug } = input;

    const updatePayload = {
      status,
      ...(status === StoryCollaboratorStatus.ACCEPTED ? { acceptedAt: Date.now() } : {}),
    };

    const collaborator = await this.storyCollaboratorRepo.findOneAndUpdate(
      { userId, slug },
      updatePayload,
      options
    );

    if (!collaborator) {
      this.throwNotFoundError('Collaborator not found or no update was applied.');
    }

    return collaborator;
  }

  async getAllStoryMemberDetailsBySlug(
    input: IGetAllStoryMembersBySlugDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaboratorDetailsResponse[]> {
    await this.ensureStoryExistsBySlug(input.slug, this.storyRepo, options);

    const pipeline = new StoryCollaboratorPipelineBuilder()
      .matchStoryBySlug(input.slug)
      .populatedCollaboratorUser()
      .populatedInvitedByUser()
      .build();

    const members =
      await this.storyCollaboratorRepo.aggregateStories<IStoryCollaboratorDetailsResponse>(
        pipeline,
        options
      );

    if (!members) {
      this.throwNotFoundError(`No collaborators found for ${input.slug} story`);
    }

    return members;
  }

  async getCollaboratorRole(
    userId: string,
    slug: string,
    options: IOperationOptions = {}
  ): Promise<TStoryCollaboratorRole | null> {
    const story = await this.ensureStoryExistsBySlug(slug, this.storyRepo, options);

    if (story.creatorId === userId) {
      return StoryCollaboratorRole.OWNER;
    }

    const collaborator = await this.storyCollaboratorRepo.findOne({
      slug,
      userId,
      status: StoryCollaboratorStatus.ACCEPTED,
    });

    if (collaborator) {
      return collaborator.role;
    }

    return null;
  }
}
