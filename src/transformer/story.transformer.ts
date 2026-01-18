import { IStory } from '@features/story/types/story.types';
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
}
