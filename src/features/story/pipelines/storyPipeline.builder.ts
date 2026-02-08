import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { getDisplayNumberStages, PUBLIC_USER_PROJECTION } from '@/shared/pipelines/stages';
import { ID } from '@/types';
import { toId } from '@/utils';
import { IStorySettings } from '../types/story.types';
import { StoryCollaboratorStatus } from '@/features/storyCollaborator/types/storyCollaborator-enum';
import { StoryStatus } from '../types/story-enum';
import { ChapterStatus } from '@/features/chapter/types/chapter-enum';

class StoryPipelineBuilder extends BasePipelineBuilder<StoryPipelineBuilder> {
  /**
   * Matches a story by its ID.
   */
  findById(storyId: ID) {
    this.pipeline.push({
      $match: {
        _id: toId(storyId),
      },
    });
    return this;
  }

  /**
   * Matches a story by its slug.
   */
  findBySlug(slug: string) {
    this.pipeline.push({
      $match: {
        slug,
      },
    });
    return this;
  }

  /**
   * Filters stories created within the last N days.
   */
  createdWithinLastDays(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    this.pipeline.push({
      $match: {
        createdAt: { $gte: startDate, $lt: new Date() },
      },
    });
    return this;
  }

  /**
   * Filters only published stories.
   */
  filterPublished() {
    this.pipeline.push({
      $match: {
        status: StoryStatus.PUBLISHED,
      },
    });
    return this;
  }

  /**
   * Projects specific settings keys as top-level fields.
   */
  projectSettings(keys: (keyof IStorySettings)[]) {
    const fields: Partial<Record<keyof IStorySettings, string>> = {};

    keys.forEach((element) => {
      fields[element] = `$settings.${element}`;
    });

    this.pipeline.push({
      $set: fields,
    });

    return this;
  }

  /**
   * Attaches creator details to the story.
   */
  attachCreator() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: 'clerkId',
          as: 'creator',
          pipeline: [
            {
              $project: {
                clerkId: 1,
                email: 1,
                username: 1,
                avatarUrl: 1,
              },
            },
          ],
        },
      },
      {
        $set: {
          creator: { $arrayElemAt: ['$creator', 0] },
        },
      },
      {
        $unset: 'creatorId',
      }
    );

    return this;
  }

  /**
   * Attaches collaborator details with user info.
   */
  attachCollaborators() {
    this.pipeline.push({
      $lookup: {
        from: 'storycollaborators',
        let: { storySlug: '$slug' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$slug', '$$storySlug'] },
              status: StoryCollaboratorStatus.ACCEPTED,
            },
          },
          { $project: { userId: 1, role: 1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: 'clerkId',
              pipeline: [{ $project: { username: 1, clerkId: 1, avatarUrl: 1 } }],
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $project: {
              username: '$user.username',
              clerkId: '$user.clerkId',
              avatarUrl: '$user.avatarUrl',
              role: '$role',
            },
          },
        ],
        as: 'collaborators',
      },
    });

    return this;
  }

  /**
   * Attaches the latest chapters with author and displayNumber.
   * Uses shared stages for ancestor/displayNumber calculation.
   */
  attachLatestChapters(limit: number) {
    this.pipeline.push({
      $lookup: {
        from: 'chapters',
        let: { storySlug: '$slug' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$storySlug', '$$storySlug'] },
              status: ChapterStatus.PUBLISHED,
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $project: {
              title: 1,
              slug: 1,
              createdAt: 1,
              authorId: 1,
              ancestorSlugs: 1,
              branchIndex: 1,
            },
          },
          // Attach creator/author
          {
            $lookup: {
              from: 'users',
              let: { userId: '$authorId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$clerkId', '$$userId'] },
                  },
                },
                { $project: PUBLIC_USER_PROJECTION },
              ],
              as: 'creator',
            },
          },
          {
            $unwind: {
              path: '$creator',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Use shared stages for displayNumber calculation
          ...getDisplayNumberStages(),
        ],
        as: 'latestChapters',
      },
    });

    return this;
  }
}

export { StoryPipelineBuilder };
