import { StoryStatus } from '../../constants';
import { ID, IOperationOptions } from '../../types';
import { buildChapterTree, toId } from '../../utils';
import { BaseModule } from '../../utils/baseClass';
import { withTransaction } from '../../utils/withTransaction';
import { ChapterService } from '../chapter/chapter.service';
import { IChapter } from '../chapter/chapter.types';
import { ChapterRepository } from '../chapter/repositories/chapter.repository';
import { StoryCollaboratorSerice } from '../storyCollaborator/storyCollaborator.service';
import { IStoryCollaborator } from '../storyCollaborator/storyCollaborator.types';
import {
  IPublishedStoryDTO,
  IStoryCreateDTO,
  TStoryAddChapterDTO,
  TStoryCreateInviteLinkDTO,
} from '../../dto/story.dto';
import { StoryPipelineBuilder } from './pipelines/storyPipeline.builder';
import { StoryRepository } from './repository/story.repository';
import { IStory, TStoryStatus } from './story.types';
import { StoryRules } from '../../domain/story.rules';

export class StoryService extends BaseModule {
  private readonly storyRepo = new StoryRepository();
  private readonly chapterService = new ChapterService();
  private readonly chapterRepo = new ChapterRepository();
  private readonly storyCollaboratorService = new StoryCollaboratorSerice();

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
  async getStoryById(storyId: ID, options: IOperationOptions = {}): Promise<IStory> {
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
    status: TStoryStatus,
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

    if (!updated) {
      this.throwInternalError('Failed to update story status');
    }

    return updated;
  }

  async getStoryTree(storyId: string): Promise<{ storyId: string; chapters: IChapter[] }> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      this.throwNotFoundError('Story not found.');
    }

    const chapters = await this.chapterRepo.findByStoryId(storyId);

    if (!chapters || chapters.length === 0) {
      return {
        storyId: storyId,
        chapters: [],
      };
    }

    // TODO: Move to story rules
    const tree = buildChapterTree(chapters);

    return {
      storyId: storyId,
      chapters: tree,
    };
  }

  // TODO: After creating new chapter versioning system, integrate versioning here
  async addChapterToStory(input: TStoryAddChapterDTO) {
    return await withTransaction('Adding chapter to story', async (session) => {
      const { storyId, userId, ...chapterData } = input;

      // -----------------------------------------
      // 1. Validate story
      // -----------------------------------------
      const story = await this.getStoryById(toId(storyId), { session });

      if (!story) {
        this.throwNotFoundError('Story not found.');
      }

      // -----------------------------------------
      // CASE 1 — ROOT CHAPTER
      // -----------------------------------------
      const isRootChapter = !chapterData.parentChapterId;

      if (isRootChapter) {
        // Permission check
        if (!StoryRules.canAddRootChapter(story, userId)) {
          this.throwForbiddenError('Only the creator of this story can add root-level chapters.');
        }

        const rootChapterInput = {
          storyId,
          userId,
          title: chapterData.title,
          content: chapterData.content,
        };

        const newChapter = await this.chapterService.createRootChapter(rootChapterInput, {
          session,
        });

        return newChapter;
      }

      // -----------------------------------------
      // CASE 2 — CHILD CHAPTER
      // -----------------------------------------
      const parentChapter = await this.chapterService.getChapterById(
        chapterData.parentChapterId as string,
        {
          session,
        }
      );

      // Validate parent
      if (!parentChapter || parentChapter.storyId.toString() !== storyId) {
        console.log('CONDITION MET');
        this.throwBadRequest('Invalid parent chapter ID.');
      }

      // Permission check
      if (!StoryRules.canAddChapter(story, userId)) {
        this.throwForbiddenError('You do not have permission to add chapters to this story.');
      }

      // Publishing rules
      const canAddDirect = StoryRules.canAddChapterDirectly(story, userId);
      const mustPR = StoryRules.mustUsePRForChapterAddition(story, userId);

      if (mustPR && !canAddDirect) {
        this.throwForbiddenError('You must create a pull request to add chapters to this story.');
      }

      // Determine status
      let status: TStoryStatus = StoryStatus.DRAFT;
      if (canAddDirect && !mustPR) {
        status = StoryStatus.PUBLISHED;
      }

      // Depth & ancestry
      const depth = parentChapter.depth + 1;
      const ancestorIds = [...parentChapter.ancestorIds, parentChapter._id];

      const childChapterInput = {
        storyId,
        userId,
        parentChapterId: parentChapter._id,
        ancestorIds,
        depth,
        status,
        title: chapterData.title,
        content: chapterData.content,
      };

      const newChapter = await this.chapterService.createChildChapter(childChapterInput, {
        session,
      });

      return newChapter;
    });
  }

  async publishStory(input: IPublishedStoryDTO) {
    const { storyId } = input;

    const story = await this.storyRepo.findById(storyId);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    if (!StoryRules.canPublishStory(story, input.userId)) {
      this.throwForbiddenError('You do not have permission to publish this story.');
    }

    const updatedStory = await this.storyRepo.changeStoryStatusToPublished(storyId);

    if (!updatedStory) {
      this.throwInternalError('Failed to publish story');
    }

    return updatedStory;
  }

  async createInvitation(
    input: TStoryCreateInviteLinkDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const collaborator = await this.storyCollaboratorService.inviteCollaborator(input, options);

    if (!collaborator) {
      this.throwInternalError('Failed to create invite link');
    }

    return collaborator;
  }
}

export const storyService = new StoryService();
