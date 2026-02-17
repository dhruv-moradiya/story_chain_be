import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';

import { ID } from '@/types';
import { toId } from '@/utils';
import { IStory, IStorySettings } from '../types/story.types';

import { StoryStatus } from '../types/story-enum';

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
   * Matches stories created by a specific user.
   */
  createdByUser(userId: string) {
    this.pipeline.push({
      $match: {
        creatorId: userId,
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

  removeFields(fields: (keyof IStory)[]) {
    this.pipeline.push({
      $unset: fields,
    });
    return this;
  }

  resolveUserStoryAccess(userId: string) {
    this.pipeline.push(
      {
        $lookup: {
          from: 'storycollaborators',
          let: { storySlug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$slug', '$$storySlug'] },
                    {
                      $eq: ['$userId', userId],
                    },
                  ],
                },
              },
            },
            {
              $project: { role: 1, status: 1, _id: 0 },
            },
          ],
          as: 'collaboratorRole',
        },
      },
      {
        $addFields: {
          role: { $first: '$collaboratorRole.role' },
          roleStatus: {
            $first: '$collaboratorRole.status',
          },
        },
      }
    );

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
          let: { clerkId: '$creatorId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$clerkId', '$$clerkId'],
                },
              },
            },
            {
              $project: {
                clerkId: 1,
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'creator',
        },
      },
      {
        $unwind: '$creator',
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
              $expr: {
                $eq: ['$slug', '$$storySlug'],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              let: { collaboratorId: '$userId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$clerkId', '$$collaboratorId'],
                    },
                  },
                },
                {
                  $project: {
                    clerkId: 1,
                    username: 1,
                    email: 1,
                  },
                },
              ],
              as: 'details',
            },
          },
          {
            $unwind: '$details',
          },
          {
            $project: {
              role: 1,
              status: 1,
              details: 1,
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
              $expr: {
                $eq: ['$storySlug', '$$storySlug'],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'chapters',
              let: {
                ancestorSlugs: '$ancestorSlugs',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$slug', '$$ancestorSlugs'],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    slug: 1,
                    branchIndex: 1,
                  },
                },
              ],
              as: 'ancestorDetails',
            },
          },
          {
            $addFields: {
              ancestorDetails: {
                $map: {
                  input: '$ancestorSlugs',
                  as: 'ancestorSlug',
                  in: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$ancestorDetails',
                          cond: {
                            $eq: ['$$this.slug', '$$ancestorSlug'],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              displayNumber: {
                $cond: {
                  if: {
                    $eq: [
                      {
                        $size: {
                          $ifNull: ['$ancestorSlugs', []],
                        },
                      },
                      0,
                    ],
                  },
                  then: {
                    $toString: '$branchIndex',
                  },
                  else: {
                    $concat: [
                      {
                        $reduce: {
                          input: '$ancestorDetails',
                          initialValue: '',
                          in: {
                            $concat: [
                              '$$value',
                              {
                                $cond: [
                                  {
                                    $eq: ['$$value', ''],
                                  },
                                  '',
                                  '.',
                                ],
                              },
                              {
                                $toString: '$$this.branchIndex',
                              },
                            ],
                          },
                        },
                      },
                      '.',
                      { $toString: '$branchIndex' },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              storySlug: 1,
              slug: 1,
              ancestorDetails: 1,
              ancestorSlugs: 1,
              displayNumber: 1,
              stats: 1,
              vote: 1,
            },
          },
        ],
        as: 'latestChapters',
      },
    });

    return this;
  }

  // ==================== PRESETS ====================
  getCurrentUserStoryPreset(userId: string) {
    return this.createdByUser(userId)
      .projectSettings(['genres', 'contentRating'])
      .removeFields(['description'])
      .resolveUserStoryAccess(userId)
      .build();
  }

  getStoryOverviewPreset(slug: string) {
    return this.findBySlug(slug)
      .projectSettings(['genres', 'contentRating'])
      .attachCollaborators()
      .attachLatestChapters(2)
      .removeFields(['createdAt', 'updatedAt', 'creatorId']);
  }
}

export { StoryPipelineBuilder };
