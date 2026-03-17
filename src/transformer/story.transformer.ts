import { IStorySettings } from '@features/story/types/story.types';

export class StoryTransformer {
  /**
   * Create StorySettings with defaults
   */
  static createSettingsWithDefaults(settings: Partial<IStorySettings>): IStorySettings {
    return {
      isPublic: false,
      allowBranching: false,
      requireApproval: true,
      allowComments: false,
      allowVoting: false,
      genres: [],
      contentRating: 'general',
      ...settings,
    };
  }

  /**
   * Check if settings indicate restricted content
   */
  static isRestrictedContent(settings: IStorySettings): boolean {
    return ['mature', 'r18', 'r18g'].includes(settings.contentRating);
  }

  /**
   * Check if settings allow public collaboration
   */
  static allowsPublicCollaboration(settings: IStorySettings): boolean {
    return settings.allowBranching && settings.isPublic;
  }
}
