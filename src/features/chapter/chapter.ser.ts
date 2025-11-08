// External Dependencies

// Constants

// Models

// Utilities
import { logger } from '../../utils/logger';

// Services
import { StoryRepository } from '../story/story.service';

// Types
import { PullRequestRepository } from '../pullRequest/repositories/pullRequest.repository';
import { IStory } from '../story/story.types';
import { StoryCollaboratorRepository } from '../storyCollaborator/storyCollaborator.service';
import { UserRepository } from '../user/user.service';
import { ChapterDocumentBuilder } from './builders/document.builder';
import { ChapterTreeBuilder } from './builders/tree.builder';
import { CreateChapterResponse, IChapter, IChapterTreeMetadata } from './chapter.types';
import { ChapterRepository } from './repositories/chapter.repository';
import { PublishModeResolver } from './strategies/publishMode.resolver';
import { DirectPublishHandler, PRPublishHandler } from './strategies/publishMode.strategy';
import { BranchingValidator } from './validators/branching.validator';
import { InputValidator } from './validators/input.validator';
import { StoryValidator } from './validators/story.validator';

// ========================================
// MAIN SERVICE CLASS
// ========================================

// Input type for createChapter
export interface IChapterCreateInput {
  storyId: string;
  parentChapterId?: string;
  content: string;
  title: string;
  userId: string;
}

// Return type for createChapter

export class ChapterService {
  private readonly chapterRepo: ChapterRepository;
  private readonly storyRepo: StoryRepository;
  private readonly userRepo: UserRepository;
  private readonly collaboratorRepo: StoryCollaboratorRepository;

  private readonly inputValidator: InputValidator;
  private readonly storyValidator: StoryValidator;
  private readonly branchingValidator: BranchingValidator;

  private readonly treeBuilder: ChapterTreeBuilder;
  private readonly publishModeResolver: PublishModeResolver;
  private readonly docBuilder: ChapterDocumentBuilder;

  private readonly directPublishHandler: DirectPublishHandler;
  private readonly prPublishHandler: PRPublishHandler;

  private readonly pullRequestRepo: PullRequestRepository;

  constructor() {
    // Repositories
    this.chapterRepo = new ChapterRepository();
    this.storyRepo = new StoryRepository();
    this.userRepo = new UserRepository();
    this.collaboratorRepo = new StoryCollaboratorRepository();

    // Validators
    this.inputValidator = new InputValidator();
    this.storyValidator = new StoryValidator();
    this.branchingValidator = new BranchingValidator();

    // Builders
    this.treeBuilder = new ChapterTreeBuilder(this.chapterRepo);
    this.publishModeResolver = new PublishModeResolver(this.collaboratorRepo);
    this.docBuilder = new ChapterDocumentBuilder(this.chapterRepo);

    // Handlers
    this.directPublishHandler = new DirectPublishHandler(
      this.chapterRepo,
      this.storyRepo,
      this.userRepo
    );
    this.pullRequestRepo = new PullRequestRepository();
    this.prPublishHandler = new PRPublishHandler(this.collaboratorRepo, this.pullRequestRepo);
  }

  // 🧩 Fully typed, safe method
  async createChapter(input: IChapterCreateInput): Promise<CreateChapterResponse> {
    try {
      const { storyId, parentChapterId, content, title, userId } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Validate story
      const story: IStory = await this.storyValidator.validate(storyId);

      // 3️⃣ Build chapter tree
      const treeData: IChapterTreeMetadata = await this.treeBuilder.build({
        storyId,
        parentChapterId,
        userId,
        storyCreatorId: story.creatorId.toString(),
      });

      // 4️⃣ Validate branching rules
      if (!treeData.isRootChapter && treeData.parentChapter) {
        await this.branchingValidator.validate({ story, parentChapter: treeData.parentChapter });
      }

      // 5️⃣ Resolve publish mode
      const publishMode = await this.publishModeResolver.resolve(
        story,
        userId,
        treeData.isRootChapter
      );

      // 6️⃣ Build chapter document
      const chapter: IChapter = await this.docBuilder.build({
        storyId,
        parentChapterId: parentChapterId || null,
        ancestorIds: treeData.ancestorIds,
        depth: treeData.depth,
        userId,
        content: content.trim(),
        title: title,
        chapterStatus: publishMode.chapterStatus,
        isPR: publishMode.isPR,
        isRootChapter: treeData.isRootChapter,
        parentChapter: treeData.parentChapter || null,
      });

      // 7️⃣ Handle based on publish mode
      if (publishMode.isPR) {
        return await this.prPublishHandler.handle({
          chapter,
          story,
          parentChapter: treeData.parentChapter!,
          userId,
          content: content.trim(),
          title,
        });
      }

      return await this.directPublishHandler.handle({
        chapter,
        story,
        treeData,
        userId,
        parentChapterId,
      });
    } catch (error: unknown) {
      logger.error('Error in ChapterService.createChapter:', error);
      throw error;
    }
  }

  // 🪄 Future methods: typed placeholders for next handlers
  async publishChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async deleteChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async updateChapter(_chapterId: string, _updates: Partial<IChapter>): Promise<void> {
    // Implementation TBD
  }
}

export const chapterService = new ChapterService();
