import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { env } from '@config/env';
import { StoryRules } from '@domain/story.rules';
import {
  IPublishedStoryDTO,
  IStoryCollaboratorAcceptInvitationDTO,
  IStoryCreateDTO,
  IStoryUpdateCardImageBySlugDTO,
  IStoryUpdateCoverImageBySlugDTO,
  IStoryUpdateSettingDTO,
  TStoryAddChapterDTO,
  TStoryCreateInviteLinkDTO,
} from '@dto/story.dto';
import { ID, IOperationOptions } from '@/types';
import {
  IStoryCollaboratorDetailsResponse,
  IStoryWithCreator,
} from '@/types/response/story.response.types';
import { buildChapterTree, toId } from '@utils/index';
import { BaseModule } from '@utils/baseClass';
import { withTransaction } from '@utils/withTransaction';
import { ChapterService } from '@features/chapter/services/chapter.service';
import { IChapter } from '@features/chapter/types/chapter.types';
import { ChapterPipelineBuilder } from '@features/chapter/pipelines/chapterPipeline.builder';
import { ChapterRepository } from '@features/chapter/repositories/chapter.repository';
import { StoryCollaboratorService } from '@features/storyCollaborator/services/storyCollaborator.service';
import { IStoryCollaborator } from '@features/storyCollaborator/types/storyCollaborator.types';
import { StoryPipelineBuilder } from '../pipelines/storyPipeline.builder';
import { StoryRepository } from '../repositories/story.repository';
import { IStory, IStorySettingsWithImages, TStoryStatus } from '../types/story.types';
import {
  StoryCollaboratorRole,
  StoryCollaboratorStatus,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';
import { StoryStatus } from '../types/story-enum';

@singleton()
class StoryService extends BaseModule {
  constructor(
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository,
    @inject(TOKENS.ChapterService)
    private readonly chapterService: ChapterService,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepo: ChapterRepository,
    @inject(TOKENS.StoryCollaboratorService)
    private readonly storyCollaboratorService: StoryCollaboratorService
  ) {
    super();
  }

  /**
   * Create new story (with rate limiting)
   */
  async createStory(input: IStoryCreateDTO): Promise<IStory> {
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

      const collab = await this.storyCollaboratorService.createCollaborator(
        {
          userId: creatorId,
          slug: story.slug,
          role: StoryCollaboratorRole.OWNER,
          status: StoryCollaboratorStatus.ACCEPTED,
        },
        options
      );

      console.log('collab :>> ', collab);

      return story;
    });
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
   * Get story by ID (with not found error)
   */
  async getStoryBySlug(slug: string, options: IOperationOptions = {}): Promise<IStory> {
    const story = await this.storyRepo.findOne({ slug }, {}, options);

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
      this.throwInternalError('Unable to update story status. Please try again.');
    }

    return updated;
  }

  async getStoryTree(storyId: string): Promise<{ storyId: string; chapters: IChapter[] }> {
    const story = await this.storyRepo.findById(storyId);

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to generate chapter tree.');
    }

    const pipeline = new ChapterPipelineBuilder()
      .loadChaptersForStory(storyId)
      .getAuthorDetails()
      .buildChapterGraphNode()
      .build();

    const chapters = await this.chapterRepo.aggregateChapters(pipeline);

    if (!chapters || chapters.length === 0) {
      return {
        storyId,
        chapters: [],
      };
    }

    const tree = buildChapterTree(chapters);

    return {
      storyId,
      chapters: tree,
    };
  }

  async getStoryTreeBySlug(slug: string): Promise<{ storyId: string; chapters: IChapter[] }> {
    const story = await this.getStoryBySlug(slug);
    return this.getStoryTree(story._id.toString());
  }

  async addChapterToStory(input: TStoryAddChapterDTO): Promise<IChapter> {
    return await withTransaction('Creating a new chapter', async (session) => {
      const { storyId, userId, ...chapterData } = input;

      const story = await this.getStoryById(toId(storyId), { session });

      if (!story) {
        this.throwNotFoundError('Story not found.');
      }

      const isRootChapter = !chapterData.parentChapterId;

      if (isRootChapter) {
        if (!StoryRules.canAddRootChapter(story, userId)) {
          this.throwForbiddenError('Only the story creator is allowed to add root-level chapters.');
        }

        const rootChapterInput = {
          storyId,
          userId,
          title: chapterData.title,
          content: chapterData.content,
        };

        return await this.chapterService.createRootChapter(rootChapterInput, { session });
      }

      const parentChapter = await this.chapterService.getChapterById(
        chapterData.parentChapterId as string,
        { session }
      );

      if (!parentChapter || parentChapter.storyId.toString() !== storyId) {
        this.throwBadRequest(
          'The provided parent chapter ID is invalid or does not belong to this story.'
        );
      }

      if (!StoryRules.canAddChapter(story, userId)) {
        this.throwForbiddenError(
          'You do not have the required permissions to add chapters to this story.'
        );
      }

      const canAddDirect = StoryRules.canAddChapterDirectly(story, userId);
      const mustPR = StoryRules.mustUsePRForChapterAddition(story, userId);

      if (mustPR && !canAddDirect) {
        this.throwForbiddenError('A pull request is required to add new chapters to this story.');
      }

      let status: TStoryStatus = StoryStatus.DRAFT;
      if (canAddDirect && !mustPR) {
        status = StoryStatus.PUBLISHED;
      }

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

      return await this.chapterService.createChildChapter(childChapterInput, { session });
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
      this.throwInternalError('Unable to publish the story. Please try again.');
    }

    return updatedStory;
  }

  async publishStoryBySlug(input: { slug: string; userId: string }) {
    const story = await this.getStoryBySlug(input.slug);
    return this.publishStory({ storyId: story._id.toString(), userId: input.userId });
  }

  async getAllCollaboratorsBySlug(input: {
    slug: string;
    userId: string;
  }): Promise<IStoryCollaboratorDetailsResponse[]> {
    const { slug } = input;

    const collaborator = await this.storyCollaboratorService.getAllStoryMemberDetailsBySlug({
      slug,
    });

    if (!collaborator || collaborator.length === 0) {
      this.throwNotFoundError(`No collaborators found for /${slug}/ story.`);
    }

    return collaborator;
  }

  async createInvitationBySlug(
    input: Omit<TStoryCreateInviteLinkDTO, 'storyId'> & { slug: string }
  ): Promise<IStoryCollaborator> {
    const { slug, ...rest } = input;
    return this.createInvitation({ ...rest, slug });
  }

  async updateSettingBySlug(input: Omit<IStoryUpdateSettingDTO, 'storyId'> & { slug: string }) {
    const { slug, ...update } = input;
    const story = await this.storyRepo.updateStorySettingBySlug(slug, update);

    if (!story) {
      this.throwNotFoundError('Unable to update settings: the story does not exist.');
    }

    return story;
  }

  async addChapterToStoryBySlug(
    input: Omit<TStoryAddChapterDTO, 'storyId'> & { slug: string }
  ): Promise<IChapter> {
    const { slug, ...rest } = input;
    const story = await this.getStoryBySlug(slug);
    return this.addChapterToStory({ ...rest, storyId: story._id.toString() });
  }

  async createInvitation(input: TStoryCreateInviteLinkDTO): Promise<IStoryCollaborator> {
    return withTransaction('Creating collaborator invitation', async (session) => {
      const options = { session };

      const collaborator = await this.storyCollaboratorService.inviteCollaborator(input, options);

      if (!collaborator) {
        this.throwInternalError('Unable to create invitation link. Please try again.');
      }

      return collaborator;
    });
  }

  async acceptInvitation(
    input: IStoryCollaboratorAcceptInvitationDTO
  ): Promise<IStoryCollaborator> {
    return withTransaction('Accepting collaborator invitation', async (session) => {
      const { userId, slug } = input;
      const options = { session };

      const collaborator = await this.storyCollaboratorService.updateCollaboratorStatus(
        {
          status: StoryCollaboratorStatus.ACCEPTED,
          userId,
          slug,
        },
        options
      );

      if (!collaborator) {
        this.throwInternalError('Unable to accept the invitation. Please try again.');
      }

      return collaborator;
    });
  }

  async declineInvitation(input: { slug: string; userId: string }) {
    return withTransaction('Rejecting collaborator invitation', async (session) => {
      const options = { session };

      const collaborator = await this.storyCollaboratorService.updateCollaboratorStatus(
        {
          status: StoryCollaboratorStatus.DECLINED,
          userId: input.userId,
          slug: input.slug,
        },
        options
      );

      if (!collaborator) {
        this.throwInternalError('Unable to reject the invitation. Please try again.');
      }

      return collaborator;
    });
  }

  async updateSetting(input: IStoryUpdateSettingDTO) {
    const { storyId, ...update } = input;

    const story = await this.storyRepo.updateStorySetting(storyId, update);

    if (!story) {
      this.throwNotFoundError('Unable to update settings: the story does not exist.');
    }

    return story;
  }

  async getStoryImageUploadParams(slug: string, userId: string) {
    const story = await this.getStoryBySlug(slug);

    if (!StoryRules.canEditStory(story, userId)) {
      this.throwForbiddenError('You do not have permission to update this story.');
    }
    const { getSignatureURL } = await import('@utils/cloudinary.js');
    const signatureURL = getSignatureURL(slug);
    return {
      uploadURL: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload${signatureURL}`,
    };
  }

  async getStoryOverviewBySlug(slug: string): Promise<IStoryWithCreator> {
    const pipeline = new StoryPipelineBuilder()
      .storyBySlug(slug)
      .storySettings(['genres', 'contentRating'])
      .withStoryCollaborators()
      .build();

    const stories = await this.storyRepo.aggregateStories<IStoryWithCreator>(pipeline);

    if (!stories.length) {
      this.throwNotFoundError('Story not found');
    }

    return stories[0];
  }

  async getStorySettingsBySlug(slug: string): Promise<IStorySettingsWithImages> {
    const story = await this.getStoryBySlug(slug);

    if (!story) {
      this.throwNotFoundError('Story not found');
    }

    return {
      settings: story.settings,
      coverImage: story.coverImage,
      cardImage: story.cardImage,
    };
  }

  async updateStoryCoverImageBySlug(
    input: IStoryUpdateCoverImageBySlugDTO
  ): Promise<IStory['coverImage']> {
    const { slug, coverImage } = input;

    const story = await this.storyRepo.findOneAndUpdate({ slug }, { coverImage }, { new: true });

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to update cover image.');
    }

    return story.coverImage;
  }

  async updateStoryCardImageBySlug(
    input: IStoryUpdateCardImageBySlugDTO
  ): Promise<IStory['cardImage']> {
    const { slug, cardImage } = input;

    const story = await this.storyRepo.findOneAndUpdate({ slug }, { cardImage }, { new: true });

    if (!story) {
      this.throwNotFoundError('Story not found. Unable to update card image.');
    }

    return story.cardImage;
  }

  /**
   * Search stories by title
   */
  async searchStoriesByTitle(
    query: string,
    limit: number = 10
  ): Promise<Pick<IStory, '_id' | 'title'>[]> {
    return this.storyRepo.searchByTitle(query, limit);
  }
}

export { StoryService };
