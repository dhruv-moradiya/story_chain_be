import { StoryStatus } from '@/features/story/types/story-enum';
import { IStory, TStoryStatus } from '@features/story/types/story.types';
import { PublishValidationResult, StatsUpdate } from '@/types/response/story.response.types';

export class StoryRules {
  static readonly NEW_STORY_COOLDOWN_IN_DAYS = 7;

  static canCreateStory(todayCount: number): boolean {
    return todayCount < this.NEW_STORY_COOLDOWN_IN_DAYS;
  }

  static canEditStory(story: IStory, userId: string): boolean {
    return story.creatorId === userId;
  }

  static isValidStatusTransition(current: TStoryStatus, next: TStoryStatus): boolean {
    const allowedTransitions: Record<TStoryStatus, TStoryStatus[]> = {
      [StoryStatus.DRAFT]: [StoryStatus.PUBLISHED, StoryStatus.ARCHIVED, StoryStatus.DELETED],
      [StoryStatus.PUBLISHED]: [StoryStatus.ARCHIVED, StoryStatus.DELETED],
      [StoryStatus.ARCHIVED]: [StoryStatus.DELETED],
      [StoryStatus.DELETED]: [],
    };

    return allowedTransitions[current].includes(next);
  }

  static canAddRootChapter(story: IStory, userId: string): boolean {
    return story.creatorId === userId;
  }

  // TODO: expand with collaborator roles
  static canAddChapter(story: IStory, userId: string): boolean {
    return story.creatorId === userId;
  }

  // TODO: expand with collaborator roles
  static canAddChapterDirectly(story: IStory, userId: string): boolean {
    return story.creatorId === userId;
  }

  static mustUsePRForChapterAddition(story: IStory, userId: string): boolean {
    return !this.canAddChapterDirectly(story, userId);
  }

  static canPublishStory(story: IStory, userId: string): boolean {
    return story.creatorId === userId && story.status === StoryStatus.DRAFT;
  }

  /**
   * Enhanced publishing validation with detailed error messages
   */
  static validatePublishing(story: IStory, userId: string): PublishValidationResult {
    const errors: string[] = [];

    // Check ownership
    if (story.creatorId !== userId) {
      errors.push('Only the story creator can publish the story');
    }

    // Check status
    if (story.status !== StoryStatus.DRAFT) {
      errors.push('Story must be in draft status to be published');
    }

    // Check chapter count
    if (story.stats.totalChapters === 0) {
      errors.push('Story must have at least one chapter before publishing');
    }

    // Check title
    if (!story.title || story.title.trim().length < 3) {
      errors.push('Story must have a valid title (minimum 3 characters)');
    }

    // Check description
    if (!story.description || story.description.trim().length < 10) {
      errors.push('Story must have a description (minimum 10 characters)');
    }

    return {
      canPublish: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate trending score for a story
   * Formula: (reads + votes*5 + rating*10) / (days_since_publish + 1)
   */
  static calculateTrendingScore(story: IStory): number {
    if (!story.publishedAt) {
      return 0;
    }

    const daysSincePublish = (Date.now() - story.publishedAt.getTime()) / (1000 * 60 * 60 * 24);

    const engagementScore =
      story.stats.totalReads * 1 + story.stats.totalVotes * 5 + story.stats.averageRating * 10;

    const score = engagementScore / (daysSincePublish + 1);

    return Math.round(score);
  }

  /**
   * Check if story should be auto-archived
   * Rule: >365 days inactive AND <100 reads
   */
  static shouldBeArchived(story: IStory): boolean {
    const daysSinceActivity = (Date.now() - story.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceActivity > 365 && story.stats.totalReads < 100;
  }

  /**
   * Check if story is public
   */
  static isPublic(story: IStory): boolean {
    return story.settings.isPublic;
  }

  /**
   * Check if story is published
   */
  static isPublished(story: IStory): boolean {
    return story.status === StoryStatus.PUBLISHED;
  }

  /**
   * Check if story allows collaboration
   */
  static allowsCollaboration(story: IStory): boolean {
    return story.settings.allowBranching || story.settings.requireApproval;
  }

  /**
   * Update story statistics (helper for repository)
   */
  static prepareStatsUpdate(currentStats: IStory['stats'], updates: StatsUpdate): IStory['stats'] {
    return {
      ...currentStats,
      ...updates,
    };
  }
}
