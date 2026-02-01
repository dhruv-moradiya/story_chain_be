import { IStory, IStorySettings } from '@features/story/types/story.types';
import { IGetStoryOverviewBySlugResponse } from '@/types/response/story.response.types';

export class StoryTransformer {
  static storyOverviewBySlug(input: IStory): IGetStoryOverviewBySlugResponse {
    return {
      _id: input._id,
      creatorId: input.creatorId,
      description: input.description,
      slug: input.slug,
      stats: input.stats,
      tags: input.tags,
      title: input.title,
      updatedAt: input.updatedAt,
      createdAt: input.createdAt,
      coverImage: input.coverImage,
    };
  }

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
