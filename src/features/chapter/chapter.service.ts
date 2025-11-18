import { StoryRepository } from '../story/story.service';

import { BaseModule, toId } from '../../utils';
import { ApiError } from '../../utils/apiResponse';
import { withTransaction } from '../../utils/withTransaction';
import { ChapterVersionRepository } from '../chapterVersion/repositories/chapterVersion.repository';
import { PullRequestRepository } from '../pullRequest/repositories/pullRequest.repository';
import { StoryCollaboratorRepository } from '../storyCollaborator/storyCollaborator.service';
import { UserRepository } from '../user/repository/user.repository';
import { ChapterDocumentBuilder } from './builders/document.builder';
import { ChapterTreeBuilder } from './builders/tree.builder';
import {
  CreateChapterResponse,
  IChapter,
  IChapterContentUpdateInput,
  IChapterTitleUpdateInput,
} from './chapter.types';
import { IChapterCreateDTO } from './dto/chapter.dto';
import { ChapterRepository } from './repositories/chapter.repository';
import { PublishModeResolver } from './strategies/publishMode.resolver';
import { DirectPublishHandler, PRPublishHandler } from './strategies/publishMode.strategy';
import { BranchingValidator } from './validators/branching.validator';
import { ChapterValidator } from './validators/chapter.validator';
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

export class ChapterService extends BaseModule {
  private readonly chapterRepo: ChapterRepository;
  private readonly storyRepo: StoryRepository;
  private readonly userRepo: UserRepository;
  private readonly collaboratorRepo: StoryCollaboratorRepository;

  private readonly inputValidator: InputValidator;
  private readonly storyValidator: StoryValidator;
  private readonly branchingValidator: BranchingValidator;
  private readonly chapterValidator: ChapterValidator;

  private readonly treeBuilder: ChapterTreeBuilder;
  private readonly publishModeResolver: PublishModeResolver;
  private readonly docBuilder: ChapterDocumentBuilder;

  private readonly directPublishHandler: DirectPublishHandler;
  private readonly prPublishHandler: PRPublishHandler;
  private readonly pullRequestRepo: PullRequestRepository;

  private readonly chapterVersionRepo: ChapterVersionRepository;

  constructor() {
    super();

    // Repositories
    this.chapterRepo = new ChapterRepository();
    this.storyRepo = new StoryRepository();
    this.userRepo = new UserRepository();
    this.collaboratorRepo = new StoryCollaboratorRepository();
    this.pullRequestRepo = new PullRequestRepository();

    // Validators
    this.inputValidator = new InputValidator();
    this.storyValidator = new StoryValidator();
    this.branchingValidator = new BranchingValidator();
    this.chapterValidator = new ChapterValidator();

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
    this.prPublishHandler = new PRPublishHandler(
      this.collaboratorRepo,
      this.pullRequestRepo,
      this.chapterRepo
    );

    this.chapterVersionRepo = new ChapterVersionRepository();
  }

  // 🧩 Fully typed, safe method
  async createChapter(input: IChapterCreateDTO): Promise<CreateChapterResponse> {
    return await withTransaction('Creating new chapter', async (session) => {
      const { storyId, parentChapterId, content, title, userId } = input;

      // 1️⃣ Validate input
      await this.inputValidator.validate(input);

      // 2️⃣ Validate story
      const story = await this.storyValidator.validate(storyId);

      // 3️⃣ Build chapter tree
      const treeData = await this.treeBuilder.build({
        storyId,
        parentChapterId,
        userId,
        storyCreatorId: story.creatorId.toString(),
      });

      // 4️⃣ Validate branching
      if (!treeData.isRootChapter && treeData.parentChapter) {
        await this.branchingValidator.validate({
          story,
          parentChapter: treeData.parentChapter,
        });
      }

      // 5️⃣ Resolve publish mode
      const publishMode = await this.publishModeResolver.resolve(
        story,
        userId,
        treeData.isRootChapter
      );

      // 6️⃣ Build chapter document
      const chapter = await this.docBuilder.build({
        storyId,
        parentChapterId: parentChapterId || null,
        ancestorIds: treeData.ancestorIds,
        depth: treeData.depth,
        userId,
        content: content.trim(),
        title,
        chapterStatus: publishMode.chapterStatus,
        isPR: publishMode.isPR,
        isRootChapter: treeData.isRootChapter,
        parentChapter: treeData.parentChapter || null,
      });

      // 7️⃣ Branch based on publish mode
      if (publishMode.isPR) {
        // Create PR (this returns a pullRequest object)
        const prResponse = await this.prPublishHandler.handle(
          {
            chapter,
            story,
            parentChapter: treeData.parentChapter!,
            userId,
            content: content.trim(),
            title,
          },
          session
        );

        // 8️⃣ Create version *after* PR is created (using the actual prId)
        await this.chapterVersionRepo.create(
          {
            chapterId: toId(chapter._id),
            version: 1,
            content: chapter.content,
            changesSummary: 'First Chapter',
            editedBy: chapter.authorId,
            title: chapter.title,
            prId: toId(prResponse.pullRequestId),
          },
          { session }
        );

        return prResponse;
      }

      // If direct publish
      const directResponse = await this.directPublishHandler.handle(
        { chapter, story, treeData, userId, parentChapterId },
        session
      );

      // 9️⃣ Create version for direct publish
      await this.chapterVersionRepo.create(
        {
          chapterId: toId(chapter._id),
          version: 1,
          content: chapter.content,
          changesSummary: 'First Chapter',
          editedBy: chapter.authorId,
          title: chapter.title,
        },
        { session }
      );

      return directResponse;
    });
  }

  // 🪄 Future methods: typed placeholders for next handlers
  async publishChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async deleteChapter(_chapterId: string): Promise<void> {
    // Implementation TBD
  }

  async updateChapterTitle(input: IChapterTitleUpdateInput): Promise<IChapter> {
    return await withTransaction('Updating chapter title', async (session) => {
      const { chapterId, userId, title } = input;

      const chapter = await this.chapterValidator.validateChapterOwnership(userId, chapterId);

      const updatedChapter = await this.chapterRepo.updateById(
        chapterId,
        { title: title.trim() },
        { new: true, session }
      );

      if (!updatedChapter) {
        throw ApiError.internalError('Failed to update chapter title');
      }

      await this.chapterVersionRepo.create(
        {
          chapterId: toId(chapter._id),
          version: (chapter.version || 1) + 1,
          content: updatedChapter.content,
          title: updatedChapter.title,
          changesSummary: 'Title updated',
          editedBy: userId,
        },
        { session }
      );

      return updatedChapter;
    });
  }

  async updateChapterContent(input: IChapterContentUpdateInput): Promise<IChapter> {
    return await withTransaction('Updating chapter title', async (session) => {
      const { chapterId, userId, content } = input;

      const chapter = await this.chapterValidator.validateChapterOwnership(userId, chapterId);

      const updatedChapter = await this.chapterRepo.updateById(
        chapterId,
        { content: content.trim() },
        { new: true, session }
      );

      if (!updatedChapter) {
        throw ApiError.internalError('Failed to update chapter title');
      }

      await this.chapterVersionRepo.create(
        {
          chapterId: toId(chapter._id),
          version: (chapter.version || 1) + 1,
          content: updatedChapter.content,
          title: updatedChapter.title,
          changesSummary: 'Title updated',
          editedBy: userId,
        },
        { session }
      );

      return updatedChapter;
    });
  }
}

export const chapterService = new ChapterService();
