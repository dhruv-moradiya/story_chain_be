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
import { CacheService } from '@/infrastructure/cache/cache.service';

@singleton()
class StoryCrudService extends BaseModule implements IStoryCrudService {
  constructor(
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService,
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
        this.throwTooManyRequestsError(
          'DAILY_STORY_LIMIT_EXCEEDED',
          'Daily story creation limit reached. Try again tomorrow.'
        );
      }

      const story = await this.storyRepo.create({ data: { ...input }, options });

      await this.collaboratorLifecycleService.createCollaborator(
        {
          userId: creatorId,
          slug: story.slug,
          role: StoryCollaboratorRole.OWNER,
          status: StoryCollaboratorStatus.ACCEPTED,
        },
        options
      );

      await this.cacheService.invalidateStory(story.slug);

      return story;
    });
  }

  async createBulk(input: IStoryCreateDTO[]): Promise<IStory[]> {
    return await withTransaction('Bulk creating stories', async (session) => {
      const options = { session };

      // 1. Bulk insert stories
      const createdStories = await this.storyRepo.createMany(input, options);

      // 2. Prepare and bulk insert collaborators
      const collaboratorInputs = createdStories.map((story) => ({
        userId: story.creatorId,
        slug: story.slug,
        role: StoryCollaboratorRole.OWNER,
        status: StoryCollaboratorStatus.ACCEPTED,
      }));

      await this.collaboratorLifecycleService.createBulkCollaborators(collaboratorInputs, options);

      // 3. Invalidate caches in bulk
      const slugs = createdStories.map((s) => s.slug);
      await this.cacheService.invalidateStories(slugs);

      return createdStories;
    });
  }

  async updateStatus(input: IUpdateStoryStatusDTO): Promise<IStory> {
    const { slug, userId, status } = input;
    const story = await this.storyRepo.findBySlug(slug);

    if (!story) this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found.');

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have permission to update this story status.'
      );
    }

    if (!StoryRules.isValidStatusTransition(story.status, status)) {
      this.throwBadRequest(
        'INVALID_STATUS_TRANSITION',
        `Invalid status transition from '${story.status}' to '${status}'.`
      );
    }

    const updated = await this.storyRepo.findOneAndUpdate({
      filter: { slug },
      update: { status },
      options: { new: true },
    });

    if (!updated) {
      this.throwInternalError('Unable to update story status. Please try again.');
    }

    return updated;
  }

  async updateSettingsBySlug(input: IStoryUpdateSettingDTO): Promise<IStory> {
    const { slug, ...update } = input;

    const story = await this.storyRepo.updateStorySettingBySlug(slug, update);

    if (!story) {
      this.throwNotFoundError(
        'STORY_NOT_FOUND',
        'Unable to update settings: the story does not exist.'
      );
    }

    return story;
  }
}

export { StoryCrudService };
