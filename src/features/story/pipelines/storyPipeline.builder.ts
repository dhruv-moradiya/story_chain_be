import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';

import { ID } from '@/types';
import { toId } from '@/utils';
import { IStory, IStorySettings } from '../types/story.types';

import { StoryStatus } from '../types/story-enum';
import { PUBLIC_USER_PROJECTION, attachUserStages } from '@/shared/pipelines';
import { StoryCollaboratorStatus } from '@/features/storyCollaborator/types/storyCollaborator-enum';

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
   * Retrieves all accessible stories for a user (owned + collaborators)
   */
  getAllAccessible(userId: string) {
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
                    { $eq: ['$userId', userId] },
                    { $eq: ['$status', StoryCollaboratorStatus.ACCEPTED] },
                  ],
                },
              },
            },
            {
              $project: { _id: 1 },
            },
          ],
          as: 'isCollaborator',
        },
      },
      {
        $match: {
          $or: [
            { creatorId: userId }, // User is the creator
            { 'isCollaborator.0': { $exists: true } }, // User is an accepted collaborator
          ],
        },
      },
      {
        $unset: 'isCollaborator',
      }
    );
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
                    avatarUrl: 1,
                    status: 1,
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
              clerkId: '$details.clerkId',
              username: '$details.username',
              email: '$details.email',
              avatarUrl: '$details.avatarUrl',
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
          ...attachUserStages({
            localField: 'authorId',
            as: 'author',
            project: PUBLIC_USER_PROJECTION,
          }),
          {
            $project: {
              storySlug: 1,
              slug: 1,
              displayNumber: 1,
              stats: 1,
              author: 1,
              title: 1,
              updatedAt: 1,
            },
          },
        ],
        as: 'latestChapters',
      },
    });

    return this;
  }

  attachTotalStoryReadTime() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'readinghistories',
          let: { storySlug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$storySlug', '$$storySlug'],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalTime: {
                  $sum: '$totalStoryReadTime',
                },
              },
            },
            {
              $project: {
                _id: 0,
              },
            },
          ],
          as: 'totalStoryReadTime',
        },
      },
      {
        $unwind: {
          path: '$totalStoryReadTime',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          totalStoryReadTime: { $ifNull: ['$totalStoryReadTime.totalTime', 0] },
        },
      }
    );

    return this;
  }

  getUserRole(slug: string, userId: string) {
    this.pipeline.push(
      {
        $match: {
          slug,
        },
      },
      {
        $lookup: {
          from: 'storycollaborators',
          let: { storySlug: '$slug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$slug', '$$storySlug'] }, { $eq: ['$userId', userId] }],
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
          role: {
            $cond: {
              if: { $eq: ['$creatorId', userId] },
              then: 'owner',
              else: { $ifNull: [{ $first: '$collaboratorRole.role' }, 'reader'] },
            },
          },
          roleStatus: {
            $cond: {
              if: { $eq: ['$creatorId', userId] },
              then: 'accepted',
              else: { $first: '$collaboratorRole.status' },
            },
          },
        },
      },
      {
        $project: {
          role: 1,
          roleStatus: 1,
          _id: 0,
        },
      }
    );

    return this;
  }

  // ==================== EXPLORE ====================
  getFreshStories() {
    this.pipeline.push(
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          slug: 1,
          title: 1,
          cardImage: 1,
          genres: '$settings.genres',
          creator: 1,
          createdAt: 1,
        },
      },
      { $limit: 10 }
    );

    return this;
  }

  // ==================== PRESETS ====================
  getCurrentUserStoryPreset(userId: string) {
    return this.getAllAccessible(userId)
      .projectSettings(['genres', 'contentRating'])
      .removeFields(['description', 'settings', 'coverImage', 'cardImage', '_id', 'lastActivityAt'])
      .build();
  }

  getStoryOverviewPreset(slug: string) {
    return this.findBySlug(slug)
      .attachCollaborators()
      .attachLatestChapters(2)
      .removeFields(['createdAt', 'updatedAt', 'creatorId', '_id'])
      .attachTotalStoryReadTime();
  }

  getAdminStoriesTablePreset(
    params: {
      skip?: number;
      limit?: number;
      status?: string;
      search?: string;
      sortOrder?: 'asc' | 'desc';
      sortBy?: string;
    } = {}
  ) {
    const {
      skip = 0,
      limit = 10,
      status,
      search,
      sortOrder = 'desc',
      sortBy = 'createdAt',
    } = params;

    const matchStage: Record<string, unknown> = {};
    if (status) {
      matchStage.status = status;
    }
    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      this.pipeline.push({ $match: matchStage });
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy || 'createdAt';

    this.pipeline.push(
      { $sort: { [sortField]: sortDirection } },
      { $skip: skip },
      { $limit: limit },

      // Lookup Creator
      {
        $lookup: {
          from: 'users',
          let: { creatorId: '$creatorId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$clerkId', '$$creatorId'] } } },
            {
              $project: {
                clerkId: 1,
                username: 1,
                avatarUrl: 1,
                email: 1,
              },
            },
          ],
          as: 'creator',
        },
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      // Lookup Collaborators with user info
      {
        $lookup: {
          from: 'storycollaborators',
          let: { storySlug: '$slug' },
          pipeline: [
            { $match: { $expr: { $eq: ['$slug', '$$storySlug'] } } },
            {
              $lookup: {
                from: 'users',
                let: { collabUserId: '$userId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$clerkId', '$$collabUserId'] } } },
                  {
                    $project: {
                      clerkId: 1,
                      username: 1,
                      avatarUrl: 1,
                      email: 1,
                    },
                  },
                ],
                as: 'user',
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                role: 1,
                status: 1,
                user: 1,
              },
            },
          ],
          as: 'collaborators',
        },
      },

      // Lookup Story Pool
      {
        $lookup: {
          from: 'storyearningspools',
          let: { storySlug: '$slug' },
          pipeline: [
            { $match: { $expr: { $eq: ['$storySlug', '$$storySlug'] } } },
            {
              $project: {
                _id: 1,
                storySlug: 1,
                storyOwnerId: 1,
                balance: 1,
                totalReceived: 1,
                totalDistributed: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: 'storyPool',
        },
      },
      { $unwind: { path: '$storyPool', preserveNullAndEmptyArrays: true } },
      // Lookup Chapter Statistics
      {
        $lookup: {
          from: 'chapters',
          let: { storySlug: '$slug' },
          pipeline: [
            { $match: { $expr: { $eq: ['$storySlug', '$$storySlug'] } } },
            {
              $group: {
                _id: null,
                totalChapters: { $sum: 1 },
                publishedChapters: {
                  $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
                },
                draftChapters: {
                  $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
                },
                rootChapters: {
                  $sum: { $cond: [{ $eq: ['$depth', 0] }, 1, 0] },
                },
                totalReads: { $sum: '$stats.reads' },
                totalComments: { $sum: '$stats.comments' },
              },
            },
          ],
          as: 'chapterSummary',
        },
      },
      { $unwind: { path: '$chapterSummary', preserveNullAndEmptyArrays: true } },
      // Lookup Pull Request Summary
      {
        $lookup: {
          from: 'pullrequests',
          let: { storySlug: '$slug' },
          pipeline: [
            { $match: { $expr: { $eq: ['$storySlug', '$$storySlug'] } } },
            {
              $group: {
                _id: null,
                totalPullRequests: { $sum: 1 },
                pendingPullRequests: {
                  $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] },
                },
                mergedPullRequests: {
                  $sum: { $cond: [{ $eq: ['$status', 'MERGED'] }, 1, 0] },
                },
                rejectedPullRequests: {
                  $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] },
                },
              },
            },
          ],
          as: 'pullRequestSummary',
        },
      },
      { $unwind: { path: '$pullRequestSummary', preserveNullAndEmptyArrays: true } },
      // Formatting
      {
        $addFields: {
          chapterDetails: {
            totalChapters: {
              $ifNull: ['$chapterSummary.totalChapters', { $ifNull: ['$stats.totalChapters', 0] }],
            },
            publishedChapters: { $ifNull: ['$chapterSummary.publishedChapters', 0] },
            draftChapters: { $ifNull: ['$chapterSummary.draftChapters', 0] },
            rootChapters: { $ifNull: ['$chapterSummary.rootChapters', 0] },
            totalReads: {
              $ifNull: ['$chapterSummary.totalReads', { $ifNull: ['$stats.totalReads', 0] }],
            },
            totalComments: { $ifNull: ['$chapterSummary.totalComments', 0] },
          },
          pullRequestDetails: {
            totalPRs: { $ifNull: ['$pullRequestSummary.totalPullRequests', 0] },
            pendingPRs: { $ifNull: ['$pullRequestSummary.pendingPullRequests', 0] },
            mergedPRs: { $ifNull: ['$pullRequestSummary.mergedPullRequests', 0] },
            rejectedPRs: { $ifNull: ['$pullRequestSummary.rejectedPullRequests', 0] },
          },
          storyPool: {
            $ifNull: [
              '$storyPool',
              {
                balance: 0,
                totalReceived: 0,
                totalDistributed: 0,
              },
            ],
          },
        },
      },
      {
        $project: {
          chapterSummary: 0,
          pullRequestSummary: 0,
        },
      }
    );
    return this.build();
  }
}

export { StoryPipelineBuilder };
