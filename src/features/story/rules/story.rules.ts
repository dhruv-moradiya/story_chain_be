import { IStory, StoryStatus, StoryStatusType } from '../story.types';

export class StoryRules {
  static readonly NEW_STORY_COOLDOWN_IN_DAYS = 7;

  static canCreateStory(todayCount: number): boolean {
    return todayCount < this.NEW_STORY_COOLDOWN_IN_DAYS;
  }

  static canEditStory(story: IStory, userId: string): boolean {
    return story.creatorId === userId;
  }

  static isValidStatusTransition(current: StoryStatusType, next: StoryStatusType): boolean {
    const allowedTransitions: Record<StoryStatusType, StoryStatusType[]> = {
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
}
