import { ClientSession } from 'mongoose';
import { XP_REWARDS } from '../../../constants';
import { PullRequest } from '../../../models/pullRequest.model';
import { BaseHandler } from '../../../utils';
import { notificationService } from '../../notification/notification.service';
import { PullRequestRepository } from '../../pullRequest/repositories/pullRequest.repository';
import { StoryRepository } from '../../story/story.service';
import { IStory } from '../../story/story.types';
import { StoryCollaboratorRepository } from '../../storyCollaborator/storyCollaborator.service';
import { Badge } from '../../user/user.types';
import {
  IChapterTreeMetadata,
  IChapterDirectPublishInput,
  IChapterDirectPublishResult,
  IChapter,
  IChapterPRPublishHandler,
  INotifyModeratorsParams,
  IChapterPullRequestResponse,
  IPRTitleInput,
} from '../chapter.types';
import { ChapterRepository } from '../repositories/chapter.repository';
import { Notification } from '../../../models/notification.model';
import { UserRepository } from '../../user/repository/user.repository';

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

    await this._updateStoryStats(String(story._id), parentChapterId);

    const { badges, xpAwarded } = await this._awardXPAndBadges(userId, treeData.isRootChapter);

    await this._createNotifications(chapter, story, treeData, userId, badges);

    return this._buildResponse(chapter, story, treeData, xpAwarded, badges);
  }

  private async _updateStoryStats(storyId: string, parentChapterId?: string): Promise<void> {
    const updates: Record<string, unknown> = {
      $inc: { 'stats.totalChapters': 1 },
      $set: { lastActivityAt: new Date() },
    };

    if (parentChapterId) {
      const parent = await this.chapterRepo.findById(parentChapterId);
      if (parent && parent.stats.childBranches > 1) {
        (updates.$inc as Record<string, number>)['stats.totalBranches'] = 1;
      }
    }

    await this.storyRepo.updateStatistics(storyId, updates);
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

  private async _buildResponse(
    chapter: IChapter,
    story: IStory,
    treeData: IChapterTreeMetadata,
    xpAwarded: number,
    badges: Badge[]
  ): Promise<IChapterDirectPublishResult> {
    const author = await this.userRepo.findByClerkId(
      chapter.authorId,
      'username avatarUrl xp level badges'
    );

    return {
      success: true,
      isPR: false,
      message: treeData.isRootChapter
        ? 'Root chapter created successfully'
        : 'Chapter published successfully',
      chapter: { ...chapter, authorId: author },
      xpAwarded,
      badgesEarned: badges,
      stats: {
        totalChapters: story.stats.totalChapters + 1,
        depth: treeData.depth,
        isRoot: treeData.isRootChapter,
      },
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
        chapterId: chapter._id,
        parentChapterId: parentChapter._id,
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
    await this._notifyModerators({ story, pullRequestId: pullRequest._id, userId }, session);

    // Read inside the same session
    const populatedPR = await PullRequest.findById(pullRequest._id)
      .populate('parentChapterId', 'title depth')
      .session(session ?? null)
      .lean();

    if (!populatedPR) {
      this.logger.error('❌ Could not find PR in current session');
      throw new Error('Failed to retrieve the created pull request');
    }

    return {
      success: true,
      isPR: true,
      message: 'Chapter submitted for review',
      pullRequest: populatedPR,
      chapter: { _id: chapter._id, status: 'PENDING_APPROVAL' },
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
