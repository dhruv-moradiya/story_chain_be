import { inject, singleton } from 'tsyringe';

import { BaseModule } from '@/utils/baseClass';
import { withTransaction } from '@/utils/withTransaction';

import { TOKENS } from '@/container';

import { IStoryCreateDTO, IStoryUpdateSettingDTO, IUpdateStoryStatusDTO } from '@/dto/story.dto';

import { StoryRules } from '@/domain/story.rules';

import { CollaboratorLifecycleService } from '@/features/storyCollaborator/services/collaborator-lifecycle.service';
import {
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';

import { IStoryCrudService } from './interfaces/story-crud.interface';
import { StoryRepository } from '../repositories/story.repository';
import { IStory } from '../types/story.types';

@singleton()
class StoryCrudService extends BaseModule implements IStoryCrudService {
  constructor(
    @inject(TOKENS.StoryRepository) private readonly storyRepo: StoryRepository,
    @inject(TOKENS.CollaboratorLifecycleService)
    private readonly collaboratorLifecycleService: CollaboratorLifecycleService
  ) {
    super();
  }

  async create(input: IStoryCreateDTO): Promise<IStory> {
    return await withTransaction('Creating new story', async (session) => {
      const { creatorId } = input;
      const options = { session };

      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date();
      end.setUTCHours(23, 59, 59, 999);

      const todayCount = await this.storyRepo.countByCreatorInDateRange(
        creatorId,
        start,
        end,
        options
      );

      if (!StoryRules.canCreateStory(todayCount)) {
        this.throwTooManyRequestsError('Daily story creation limit reached. Try again tomorrow.');
      }

      const story = await this.storyRepo.create({ ...input }, options);

      await this.collaboratorLifecycleService.createCollaborator(
        {
          userId: creatorId,
          slug: story.slug,
          role: StoryCollaboratorRole.OWNER,
          status: StoryCollaboratorStatus.ACCEPTED,
        },
        options
      );

      return story;
    });
  }

  async updateStatus(input: IUpdateStoryStatusDTO): Promise<IStory> {
    const { slug, userId, status } = input;
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) this.throwNotFoundError('Story not found');

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError('You do not have permission to update this story.');
    }

    if (!StoryRules.isValidStatusTransition(story.status, status)) {
      this.throwBadRequest(`Invalid status transition from ${story.status} to ${status}.`);
    }

    const updated = await this.storyRepo.findOneAndUpdate({ slug }, { status }, { new: true });

    if (!updated) {
      this.throwInternalError('Unable to update story status. Please try again.');
    }

    return updated;
  }

  // TODO: Remove this method that use storyId instead of slug
  async updateSettings(input: IStoryUpdateSettingDTO): Promise<IStory> {
    const { storyId, ...update } = input;

    const story = await this.storyRepo.updateStorySetting(storyId, update);

    if (!story) {
      this.throwNotFoundError('Unable to update settings: the story does not exist.');
    }

    return story;
  }

  async updateSettingsBySlug(
    input: Omit<IStoryUpdateSettingDTO, 'storyId'> & { slug: string }
  ): Promise<IStory> {
    const { slug, ...update } = input;

    const story = await this.storyRepo.updateStorySettingBySlug(slug, update);

    if (!story) {
      this.throwNotFoundError('Unable to update settings: the story does not exist.');
    }

    return story;
  }
}

export { StoryCrudService };
