export class StoryRules {
  static readonly NEW_STORY_COOLDOWN_IN_DAYS = 7;

  static canCreateStory(todayCount: number): boolean {
    return todayCount < this.NEW_STORY_COOLDOWN_IN_DAYS;
  }
}
