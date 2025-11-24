import { ClientSession } from 'mongoose';
import { XP_REWARDS } from '../../../constants';
import { Notification } from '../../../models/notification.model';
import { notificationService } from '../../notification/notification.service';
import { PullRequestRepository } from '../../pullRequest/repositories/pullRequest.repository';
import { IStory } from '../../story/story.types';
import { StoryCollaboratorRepository } from '../../storyCollaborator/storyCollaborator.service';
import { UserRepository } from '../../user/repository/user.repository';
import { Badge } from '../../user/user.types';
import {
  IChapter,
  IChapterDirectPublishInput,
  IChapterDirectPublishResult,
  IChapterPRPublishHandler,
  IChapterPullRequestResponse,
  IChapterTreeMetadata,
  INotifyModeratorsParams,
  IPRTitleInput,
} from '../chapter.types';
import { ChapterRepository } from '../repositories/chapter.repository';
import { StoryRepository } from '../../story/repository/story.repository';
import { ID } from '../../../types';
import { BaseHandler } from '../../../utils/baseClass';
import { toId } from '../../../utils';

export class DirectPublishHandler extends BaseHandler<
  IChapterDirectPublishInput,
  IChapterDirectPublishResult
> {
  protected chapterRepo: ChapterRepository;
  protected storyRepo: StoryRepository;
  protected userRepo: UserRepository;

  constructor(
    chapterRepo: ChapterRepository,
    storyRepo: StoryRepository,
    userRepo: UserRepository
  ) {
    super();
    this.chapterRepo = chapterRepo;
    this.storyRepo = storyRepo;
    this.userRepo = userRepo;
  }

  async handle(
    data: IChapterDirectPublishInput,
    session?: ClientSession
  ): Promise<IChapterDirectPublishResult> {
    const { chapter, story, treeData, userId, parentChapterId } = data;

    if (parentChapterId) {
      await this.chapterRepo.incrementBranches(parentChapterId, session);
    }

    await this.updateStatsOnChapterCreate(story._id, parentChapterId);

    const { badges } = await this._awardXPAndBadges(userId, treeData.isRootChapter);

    await this._createNotifications(chapter, story, treeData, userId, badges);

    return this._buildResponse(chapter);
  }

  async updateStatsOnChapterCreate(storyId: ID, parentChapterId?: ID) {
    // Always increment chapter count
    await this.storyRepo.incrementTotalChapters(storyId);

    // Branch increment logic
    if (parentChapterId) {
      const parent = await this.chapterRepo.findById(parentChapterId);

      if (parent && parent.stats.childBranches > 1) {
        await this.storyRepo.incrementTotalBranches(storyId);
      }
    }
  }

  private async _awardXPAndBadges(
    userId: string,
    isRootChapter: boolean
  ): Promise<{ badges: Badge[]; xpAwarded: number }> {
    const xpAmount = isRootChapter
      ? XP_REWARDS.CREATE_ROOT_CHAPTER
      : XP_REWARDS.CREATE_BRANCH_CHAPTER;

    await this.userRepo.updateXP(userId, {
      $inc: {
        xp: xpAmount,
        'stats.chaptersWritten': 1,
        'stats.branchesCreated': isRootChapter ? 0 : 1,
      },
    });

    const badges = await this._checkBadges(userId, isRootChapter);
    return { badges, xpAwarded: xpAmount };
  }

  private async _checkBadges(userId: string, isRootChapter: boolean): Promise<Badge[]> {
    const user = await this.userRepo.findByClerkId(userId);
    if (!user) return [];

    const newBadges: Badge[] = [];

    if (isRootChapter && !user.badges.includes(Badge.STORY_STARTER)) {
      await this.userRepo.addBadge(userId, Badge.STORY_STARTER);
      newBadges.push(Badge.STORY_STARTER);
    }

    if (
      !isRootChapter &&
      user.stats.branchesCreated >= 10 &&
      !user.badges.includes(Badge.BRANCH_CREATOR)
    ) {
      await this.userRepo.addBadge(userId, Badge.BRANCH_CREATOR);
      newBadges.push(Badge.BRANCH_CREATOR);
    }

    return newBadges;
  }

  private async _createNotifications(
    chapter: IChapter,
    story: IStory,
    treeData: IChapterTreeMetadata,
    userId: string,
    badges: Badge[]
  ): Promise<void> {
    await notificationService.notifyBranchCreation(chapter, story, treeData, userId, badges);
  }

  private async _buildResponse(chapter: IChapter): Promise<IChapterDirectPublishResult> {
    return {
      _id: chapter._id.toString(),
      storyId: chapter.storyId.toString(),
      isPR: false,
    };
  }
}

export class PRPublishHandler extends BaseHandler {
  protected pullRequestRepo: PullRequestRepository;
  protected collaboratorRepo: StoryCollaboratorRepository;
  protected chapterRepo: ChapterRepository;

  constructor(
    collaboratorRepo: StoryCollaboratorRepository,
    pullRequestRepo: PullRequestRepository,
    chapterRepo: ChapterRepository
  ) {
    super();
    this.collaboratorRepo = collaboratorRepo;
    this.pullRequestRepo = pullRequestRepo;
    this.chapterRepo = chapterRepo;
  }

  async handle(
    data: IChapterPRPublishHandler,
    session?: ClientSession
  ): Promise<IChapterPullRequestResponse> {
    const { chapter, story, parentChapter, userId, content, title } = data;

    const prTitle = this._generatePRTitle({
      prType: 'NEW_CHAPTER',
      chapterTitle: title,
      chapterNumber: chapter.depth,
    });

    // Create PR inside transaction
    const pullRequest = await this.pullRequestRepo.create(
      {
        title: prTitle,
        // Use the canonical chapter.depth stored on the new chapter document instead of
        // computing from the parent. This avoids off-by-one or mismatches when depth is
        // managed elsewhere.
        description: `New chapter continuation from Chapter ${chapter.depth}`,
        storyId: story._id,
        chapterId: toId(chapter._id),
        parentChapterId: toId(parentChapter._id),
        authorId: userId,
        prType: 'NEW_CHAPTER',
        changes: { proposed: content },
        status: 'OPEN',
      },
      { session }
    );

    // Update chapter link
    await this.chapterRepo.findOneAndUpdate(
      { _id: chapter._id },
      { 'pullRequest.prId': pullRequest._id },
      { session }
    );

    // Notify moderators
    await this._notifyModerators({ story, pullRequestId: toId(pullRequest._id), userId }, session);

    return {
      _id: chapter._id.toString(),
      storyId: chapter.storyId.toString(),
      isPR: true,
      pullRequestId: pullRequest._id.toString(),
    };
  }

  private _generatePRTitle(input: IPRTitleInput): string {
    const { prType, chapterNumber, chapterTitle, summary } = input;

    const chapterRef = this._formatChapterReference(chapterNumber, chapterTitle);

    switch (prType) {
      case 'NEW_CHAPTER':
        return `[NEW] ${chapterRef}${summary ? `: ${summary}` : ''}`;

      case 'EDIT_CHAPTER':
        return `[EDIT] ${chapterRef}${summary ? `: ${summary}` : ''}`;

      case 'DELETE_CHAPTER':
        return `[DELETE] ${chapterRef}${summary ? `: ${summary}` : ''}`;

      default:
        return `[PR] ${chapterRef}`;
    }
  }

  private _formatChapterReference(chapterNumber?: number, chapterTitle?: string): string {
    if (chapterNumber && chapterTitle) return `Chapter ${chapterNumber}: ${chapterTitle}`;
    if (chapterNumber) return `Chapter ${chapterNumber}`;
    if (chapterTitle) return chapterTitle;
    return 'Chapter';
  }

  private async _notifyModerators(data: INotifyModeratorsParams, session?: ClientSession) {
    const { story, pullRequestId, userId } = data;
    const moderators = await this.collaboratorRepo.findModerators(story._id.toString());
    const moderatorIds = moderators.map((m) => m.userId.toString());

    const ownerIdString = story.creatorId.toString();
    if (!moderatorIds.includes(ownerIdString)) {
      moderatorIds.push(ownerIdString);
    }

    const notifications = moderatorIds.map((modId) => ({
      userId: modId,
      pullRequestId,
      type: 'PR_OPENED',
      triggeredBy: userId,
      message: `New pull request submitted for "${story.title}"`,
    }));

    await Notification.insertMany(notifications, { session });
  }
}
