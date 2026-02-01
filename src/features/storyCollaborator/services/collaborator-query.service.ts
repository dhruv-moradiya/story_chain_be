import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ICollaboratorQueryService } from './interfaces';
import { StoryCollaboratorPipelineBuilder } from '../pipelines/storyCollaborator.pipeline';
import { IGetAllStoryMembersBySlugDTO } from '@/dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';
import { IStoryCollaboratorDetailsResponse } from '@/types/response/story.response.types';
import { StoryCollaboratorRepository } from '../repositories/storyCollaborator.repository';
import { StoryRepository } from '@features/story/repositories/story.repository';
import { TOKENS } from '@/container';
import { TStoryCollaboratorRole } from '../types/storyCollaborator.types';
import { StoryCollaboratorRole, StoryCollaboratorStatus } from '../types/storyCollaborator-enum';

@singleton()
class CollaboratorQueryService extends BaseModule implements ICollaboratorQueryService {
  constructor(
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly storyCollaboratorRepo: StoryCollaboratorRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository
  ) {
    super();
  }

  async getCollaboratorsByStorySlug(
    input: IGetAllStoryMembersBySlugDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaboratorDetailsResponse[]> {
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
    storySlug: string,
    options: IOperationOptions = {}
  ): Promise<TStoryCollaboratorRole | null> {
    const story = await this.storyRepo.findBySlug(storySlug, options);

    if (!story) {
      this.throwNotFoundError(`Story not found for slug: ${storySlug}`);
    }

    // Check if user is the story creator (owner)
    if (story.creatorId === userId) {
      return StoryCollaboratorRole.OWNER;
    }

    // Check if user is a collaborator
    const collaborator = await this.storyCollaboratorRepo.findOne({
      slug: storySlug,
      userId,
      status: StoryCollaboratorStatus.ACCEPTED,
    });

    if (collaborator) {
      return collaborator.role;
    }

    return null;
  }
}

export { CollaboratorQueryService };
