import { IOperationOptions } from '../../types';
import { BaseModule } from '../../utils';
import { IStoryCreateDTO } from './dto/story.dto';
import { StoryRepository } from './repository/story.repository';
import { StoryRules } from './roles/story.roles';
import { IStory, StoryStatusType } from './story.types';
import { StoryPipelineBuilder } from './pipelines/storyPipeline.builder';
import { StoryStatus } from '../../constants';

export class StoryService extends BaseModule {
  private readonly storyRepo = new StoryRepository();

  /**
   * Create new story (with rate limiting)
   */
  async createStory(
    input: IStoryCreateDTO & { creatorId: string },
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const { creatorId } = input;

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

    const story = await this.storyRepo.create(input, options);
    return story;
  }

  /**
   * Get story by ID (with not found error)
   */
  async getStoryById(storyId: string, options: IOperationOptions = {}): Promise<IStory> {
    const story = await this.storyRepo.findById(storyId, {}, options);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return story;
  }

  /**
   * List all stories (paginated)
   */
  async listStories(options: IOperationOptions = {}): Promise<IStory[]> {
    return this.storyRepo.findAll({ ...options, limit: 50 });
  }

  /**
   * New stories (last 7 days)
   */
  async getNewStories(options: IOperationOptions = {}): Promise<IStory[]> {
    const pipeline = new StoryPipelineBuilder().lastSevenDaysStories().build();

    return this.storyRepo.aggregateStories(pipeline, options);
  }

  /**
   * Get all stories created by a user
   */
  async getStoriesByCreatorId(
    creatorId: string,
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    return this.storyRepo.findByCreatorId(creatorId, options);
  }

  /**
   * Get all draft stories created by a user
   */
  async getDraftStoriesByCreatorId(
    creatorId: string,
    options: IOperationOptions = {}
  ): Promise<IStory[]> {
    return this.storyRepo.findMany(
      { creatorId, status: StoryStatus.DRAFT },
      {},
      { ...options, limit: 100 }
    );
  }

  async updateStoryStatus(
    storyId: string,
    userId: string,
    status: StoryStatusType,
    options: IOperationOptions = {}
  ): Promise<IStory> {
    const story = await this.storyRepo.findById(storyId, {}, options);

    if (!story) this.throwNotFoundError('Story not found');

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError('You do not have permission to update this story.');
    }

    if (!StoryRules.isValidStatusTransition(story.status, status)) {
      this.throwBadRequest(`Invalid status transition from ${story.status} to ${status}.`);
    }

    const updated = await this.storyRepo.findOneAndUpdate(
      { _id: storyId },
      { status },
      { new: true, session: options.session }
    );

    return updated!;
  }
}

export const storyService = new StoryService();
