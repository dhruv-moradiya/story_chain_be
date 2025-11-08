// External Dependencies
import mongoose, { Types } from 'mongoose';

// Constants
import { CHAPTER_LIMITS, XP_REWARDS } from '../../constants';

// Models
import { Chapter } from '../../models/chapter.model';
import { Story } from '../../models/story.model';
import { PullRequest } from '../../models/pullRequest.model';
import { StoryCollaborator } from '../../models/storyCollaborator.model';
import { Notification } from '../../models/notification.model';
import { PRNotification } from '../../models/prNotification.model';
import { User } from '../../models/user.model';

// Utilities
import { ApiError } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

// Services
import { StoryService } from '../story/story.service';

// Types
import { IPullRequest } from '../pullRequest/pullRequest.types';
import { IStory } from '../story/story.types';
import { Badge } from '../user/user.types';
import {
  IChapterTreeMetadata,
  IChapterCreateInput,
  CreateChapterResponse,
  IChapter,
  IChapterPublishMode,
} from './chapter.types';

export class ChapterService {
  async createChapter(input: IChapterCreateInput): Promise<CreateChapterResponse> {
    try {
      const { storyId, parentChapterId, content, title, userId } = input;

      // Validate IDs
      this.validateObjectId(storyId, 'storyId');

      if (parentChapterId) {
        this.validateObjectId(parentChapterId, 'parentChapterId');
      }

      // Get and validate story
      const story = await this.getAndValidateStory(storyId);

      // Validate content
      this.validateContent(content);

      // Determine chapter type and build tree structure
      const treeData = await this.determineChapterType(
        storyId,
        parentChapterId,
        userId,
        story.creatorId.toString()
      );

      // If branching, validate branching rules
      if (!treeData.isRootChapter) {
        await this.validateBranchingRules(story, treeData.parentChapter!);
      }

      // Determine publish mode (PR or direct)
      const publishMode = await this.determinePublishMode(story, userId, treeData.isRootChapter);

      // Create the chapter
      const newChapter = await this.createChapterDocument({
        storyId,
        parentChapterId: parentChapterId || null,
        ancestorIds: treeData.ancestorIds,
        depth: treeData.depth,
        userId,
        content: content.trim(),
        title: title?.trim() || null,
        chapterStatus: publishMode.chapterStatus,
        isPR: publishMode.isPR,
      });

      // Handle PR workflow if needed
      if (publishMode.isPR) {
        return await this.handlePRWorkflow(
          newChapter,
          story,
          treeData.parentChapter!,
          userId,
          content.trim(),
          title
        );
      }

      // Handle direct publish workflow
      return await this.handleDirectPublishWorkflow(
        newChapter,
        story,
        treeData,
        userId,
        parentChapterId
      );
    } catch (error) {
      // Log the error for debugging and rethrow so controller can catch it
      try {
        logger.error('Error in ChapterService.createChapter: %o', error);
      } catch (logErr) {
        // If logging fails, ignore to avoid masking original error
      }
      throw error;
    }
  }
  // ========================================
  // VALIDATION METHODS
  // ========================================
  private validateObjectId(id: string, fieldName: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.validationError(`${fieldName} is not a valid ObjectId`);
    }
  }

  private validateContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw ApiError.validationError('Content is required');
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < CHAPTER_LIMITS.CONTENT.MIN_LENGTH) {
      throw ApiError.validationError(
        `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters long.`
      );
    }

    if (trimmedContent.length > CHAPTER_LIMITS.CONTENT.MAX_LENGTH) {
      throw ApiError.validationError(
        `Content must not exceed ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters.`
      );
    }
  }

  private async getAndValidateStory(storyId: string): Promise<IStory> {
    const story = await StoryService.getStoryById(storyId);

    if (!story) {
      throw ApiError.validationError('Story not found');
    }

    if (story.status === 'DELETED') {
      throw ApiError.validationError('This story has been deleted');
    }

    return story;
  }

  private async validateBranchingRules(story: IStory, parentChapter: IChapter) {
    // Check if branching is allowed
    if (!story.settings.allowBranching) {
      throw ApiError.forbidden('Branching is not allowed for this story');
    }

    // Validate depth limit
    if (parentChapter.depth >= CHAPTER_LIMITS.DEPTH.MAX) {
      throw ApiError.validationError(`Maximum story depth (${CHAPTER_LIMITS.DEPTH.MAX}) reached`);
    }

    // Validate branch limit
    if (parentChapter.stats.childBranches >= CHAPTER_LIMITS.BRANCHES.MAX_PER_CHAPTER) {
      throw ApiError.validationError(
        `Maximum branches (${CHAPTER_LIMITS.BRANCHES.MAX_PER_CHAPTER}) reached for this chapter`
      );
    }
  }

  // ========================================
  // CHAPTER TYPE DETERMINATION
  // ========================================
  private async determineChapterType(
    storyId: string,
    parentChapterId: string | undefined,
    userId: string,
    storyCreatorId: string
  ): Promise<IChapterTreeMetadata> {
    if (!parentChapterId) {
      // ROOT CHAPTER
      return await this.handleRootChapterCreation(storyId, userId, storyCreatorId);
    } else {
      // BRANCH CHAPTER
      return await this.handleBranchChapterCreation(storyId, parentChapterId);
    }
  }

  private async handleRootChapterCreation(
    storyId: string,
    userId: string,
    storyCreatorId: string
  ): Promise<IChapterTreeMetadata> {
    // Check if root already exists
    const existingRoot = await Chapter.findOne({
      storyId,
      parentChapterId: null,
    });

    console.log('existingRoot :>> ', existingRoot);
    if (existingRoot) {
      throw ApiError.validationError('Root chapter already exists for this story');
    }

    // Only story creator can create root
    if (storyCreatorId !== userId) {
      throw ApiError.forbidden('Only the story creator can add the root chapter');
    }

    return {
      ancestorIds: [],
      depth: 0,
      isRootChapter: true,
      parentChapter: null,
    };
  }

  private async handleBranchChapterCreation(
    storyId: string,
    parentChapterId: string
  ): Promise<IChapterTreeMetadata> {
    const parentChapter = await Chapter.findById(parentChapterId);

    if (!parentChapter) {
      throw ApiError.validationError('Parent chapter not found');
    }

    // Verify parent belongs to same story
    if (parentChapter.storyId.toString() !== storyId) {
      throw ApiError.validationError('Parent chapter does not belong to this story');
    }

    // Check if parent is deleted
    if (parentChapter.status === 'DELETED') {
      throw ApiError.validationError('Cannot branch from a deleted chapter');
    }

    const ancestorIds = [
      ...(parentChapter.ancestorIds as mongoose.Types.ObjectId[]),
      parentChapter._id as mongoose.Types.ObjectId,
    ];
    const depth = parentChapter.depth + 1;

    return {
      ancestorIds,
      depth,
      isRootChapter: false,
      parentChapter,
    };
  }

  // ========================================
  // PUBLISH MODE DETERMINATION
  // ========================================
  private async determinePublishMode(
    story: any,
    userId: string,
    isRootChapter: boolean
  ): Promise<IChapterPublishMode> {
    // Root chapters always publish directly
    if (isRootChapter) {
      return {
        chapterStatus: 'PUBLISHED',
        isPR: false,
      };
    }

    // If story doesn't require approval, publish directly
    if (!story.settings.requireApproval) {
      return {
        chapterStatus: 'PUBLISHED',
        isPR: false,
      };
    }

    // Check if user is owner
    const isOwner = story.creatorId.toString() === userId;
    if (isOwner) {
      return {
        chapterStatus: 'PUBLISHED',
        isPR: false,
      };
    }

    // Check if user has approval bypass permission
    const hasApprovalBypass = await this.checkApprovalBypass(story._id, userId);
    if (hasApprovalBypass) {
      return {
        chapterStatus: 'PUBLISHED',
        isPR: false,
      };
    }

    // Submit as PR
    return {
      chapterStatus: 'PENDING_APPROVAL',
      isPR: true,
    };
  }

  private async checkApprovalBypass(storyId: Types.ObjectId, userId: string): Promise<boolean> {
    const collaborator = await StoryCollaborator.findOne({
      storyId,
      userId,
      status: 'ACCEPTED',
    });

    return collaborator?.permissions?.canApprove ?? false;
  }

  // ========================================
  // CHAPTER DOCUMENT CREATION
  // ========================================
  private async createChapterDocument(data: {
    storyId: string;
    parentChapterId: string | null;
    ancestorIds: Types.ObjectId[];
    depth: number;
    userId: string;
    content: string;
    title: string | null;
    chapterStatus: 'PUBLISHED' | 'PENDING_APPROVAL';
    isPR: boolean;
  }) {
    return await Chapter.create({
      storyId: data.storyId,
      parentChapterId: data.parentChapterId,
      ancestorIds: data.ancestorIds,
      depth: data.depth,
      authorId: data.userId,
      content: data.content,
      title: data.title,
      status: data.chapterStatus,
      pullRequest: {
        isPR: data.isPR,
        status: data.isPR ? 'PENDING' : 'APPROVED',
        submittedAt: data.isPR ? new Date() : null,
      },
    });
  }

  // ========================================
  // PR WORKFLOW
  // ========================================

  private async handlePRWorkflow(
    chapter: IChapter,
    story: IStory,
    parentChapter: IChapter,
    userId: string,
    content: string,
    title?: string
  ): Promise<CreateChapterResponse> {
    // Create pull request
    const pullRequest = await PullRequest.create({
      title: title || `Chapter ${parentChapter.depth + 2}`,
      description: `New chapter continuation from Chapter ${parentChapter.depth + 1}`,
      storyId: story._id,
      chapterId: chapter._id,
      parentChapterId: parentChapter._id,
      authorId: userId,
      prType: 'NEW_CHAPTER',
      changes: {
        proposed: content,
      },
      status: 'OPEN',
    });

    // Link PR to chapter
    await Chapter.findByIdAndUpdate(chapter._id, {
      'pullRequest.prId': pullRequest._id,
    });

    // Notify moderators
    await this.notifyModerators(story, pullRequest._id as Types.ObjectId, userId);

    // Return PR response
    // Populate parent chapter, but fetch author by clerkId to avoid casting Clerk IDs to ObjectId
    const prDoc = await PullRequest.findById(pullRequest._id)
      .populate('parentChapterId', 'title depth')
      .lean();

    if (!prDoc) {
      throw new Error('Failed to retrieve the created pull request');
    }

    const author = await (
      await import('../../models/user.model')
    ).User.findOne({
      clerkId: prDoc.authorId,
    }).select('username avatarUrl xp level');

    const populatedPR = { ...prDoc, authorId: author } as unknown as IPullRequest;

    return {
      success: true,
      isPR: true,
      message: 'Chapter submitted for review',
      pullRequest: populatedPR,
      chapter: {
        _id: chapter._id,
        status: 'PENDING_APPROVAL',
      },
    };
  }

  private async notifyModerators(story: any, pullRequestId: Types.ObjectId, userId: string) {
    // Get all collaborators with approval permission
    const collaborators = await StoryCollaborator.find({
      storyId: story._id,
      status: 'ACCEPTED',
      'permissions.canApprove': true,
    }).select('userId');

    const moderatorIds = collaborators.map((c) => c.userId.toString());

    // Add story owner if not already included
    const ownerIdString = story.creatorId.toString();
    if (!moderatorIds.includes(ownerIdString)) {
      moderatorIds.push(ownerIdString);
    }

    // Create notifications
    const notifications = moderatorIds.map((modId) => ({
      userId: modId,
      pullRequestId,
      type: 'PR_OPENED',
      triggeredBy: userId,
      message: `New pull request submitted for "${story.title}"`,
    }));

    await PRNotification.insertMany(notifications);
  }

  // ========================================
  // DIRECT PUBLISH WORKFLOW
  // ========================================

  private async handleDirectPublishWorkflow(
    chapter: any,
    story: any,
    treeData: IChapterTreeMetadata,
    userId: string,
    parentChapterId?: string
  ): Promise<CreateChapterResponse> {
    // Update parent chapter if branching
    if (parentChapterId) {
      await Chapter.findByIdAndUpdate(parentChapterId, {
        $inc: { 'stats.childBranches': 1 },
      });
    }

    // Update story statistics
    await this.updateStoryStatistics(story._id, parentChapterId);

    // Award XP and check badges
    const xpAmount = treeData.isRootChapter
      ? XP_REWARDS.CREATE_ROOT_CHAPTER
      : XP_REWARDS.CREATE_BRANCH_CHAPTER;
    const newBadges = await this.awardXPAndBadges(userId, xpAmount, treeData.isRootChapter);
    console.log('newBadges :>> ', newBadges);

    // Create notifications
    await this.createNotifications(
      chapter,
      story,
      treeData.parentChapter,
      userId,
      treeData.isRootChapter,
      newBadges
    );

    console.log('CREATE NOTI DONE');

    // Return success response
    const author = await User.findOne(
      { clerkId: chapter.authorId },
      'username avatarUrl xp level badges'
    ).lean();

    const populatedChapter = { ...chapter, authorId: author };

    return {
      success: true,
      isPR: false,
      message: treeData.isRootChapter
        ? 'Root chapter created successfully'
        : 'Chapter published successfully',
      chapter: populatedChapter,
      xpAwarded: xpAmount,
      badgesEarned: newBadges,
      stats: {
        totalChapters: story.stats.totalChapters + 1,
        depth: treeData.depth,
        isRoot: treeData.isRootChapter,
      },
    };
  }

  // ========================================
  // STATISTICS & REWARDS
  // ========================================

  private async updateStoryStatistics(storyId: Types.ObjectId, parentChapterId?: string) {
    const storyUpdates: any = {
      $inc: {
        'stats.totalChapters': 1,
      },
      $set: {
        lastActivityAt: new Date(),
      },
    };

    // Increment branches if parent has multiple children now
    if (parentChapterId) {
      const updatedParent = await Chapter.findById(parentChapterId);
      if (updatedParent && updatedParent.stats.childBranches > 1) {
        storyUpdates.$inc['stats.totalBranches'] = 1;
      }
    }

    await Story.findByIdAndUpdate(storyId, storyUpdates);
  }

  private async awardXPAndBadges(
    userId: string,
    xpAmount: number,
    isRootChapter: boolean
  ): Promise<string[]> {
    // Award XP

    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $inc: {
          xp: xpAmount,
          'stats.chaptersWritten': 1,
          'stats.branchesCreated': isRootChapter ? 0 : 1,
        },
      }
    );

    // Check for badge eligibility
    const user = await User.findOne({ clerkId: userId });
    if (!user) return [];

    const newBadges: string[] = [];

    // Story Starter badge
    if (isRootChapter && !user.badges.includes(Badge.STORY_STARTER)) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        {
          $push: { badges: Badge.STORY_STARTER },
        }
      );
      newBadges.push('STORY_STARTER');
    }

    // Branch Creator badge (10 branches)
    if (
      !isRootChapter &&
      user.stats.branchesCreated >= 10 &&
      !user.badges.includes(Badge.BRANCH_CREATOR)
    ) {
      await User.findOneAndUpdate(
        { clerkId: userId },
        {
          $push: { badges: Badge.BRANCH_CREATOR },
        }
      );
      newBadges.push(Badge.BRANCH_CREATOR);
    }

    return newBadges;
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  private async createNotifications(
    chapter: any,
    story: any,
    parentChapter: any | null,
    userId: string,
    isRootChapter: boolean,
    newBadges: string[]
  ) {
    // Notify parent chapter author (if branching)
    if (parentChapter && parentChapter.authorId.toString() !== userId) {
      await Notification.create({
        userId: parentChapter.authorId,
        type: 'NEW_BRANCH',
        relatedStoryId: story._id,
        relatedChapterId: chapter._id,
        relatedUserId: userId,
        title: 'New Branch Created!',
        message: `Someone continued your chapter in "${story.title}"`,
      });
    }

    // Notify story owner (if not the author)
    if (story.creatorId.toString() !== userId && !isRootChapter) {
      await Notification.create({
        userId: story.creatorId,
        type: 'STORY_CONTINUED',
        relatedStoryId: story._id,
        relatedChapterId: chapter._id,
        relatedUserId: userId,
        title: 'Story Continued!',
        message: `New chapter added to "${story.title}"`,
      });
    }

    // Badge notifications
    if (newBadges.length > 0) {
      await Notification.create({
        userId,
        type: 'BADGE_EARNED',
        title: 'Achievement Unlocked!',
        message: `You earned the ${newBadges.join(', ')} badge${newBadges.length > 1 ? 's' : ''}!`,
      });
    }
  }
}

export const chapterService = new ChapterService();
