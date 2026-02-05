import { PipelineStage } from 'mongoose';
import { logger } from '@/utils/logger';
import { ID } from '@/types';
import { toId } from '@/utils';
import { IStorySettings } from '../types/story.types';
import { StoryCollaboratorStatus } from '@/features/storyCollaborator/types/storyCollaborator-enum';
import { StoryStatus } from '../types/story-enum';

class StoryPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  createdWithinLastDays(days = 7) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - days);

    this.pipeline.push({
      $match: {
        createdAt: { $gte: sevenDaysAgo, $lt: new Date() },
      },
    });
    return this;
  }

  filterPublished() {
    this.pipeline.push({
      $match: {
        status: StoryStatus.PUBLISHED,
      },
    });
    return this;
  }

  findById(storyId: ID) {
    this.pipeline.push({
      $match: {
        _id: toId(storyId),
      },
    });
    return this;
  }

  findBySlug(slug: string) {
    this.pipeline.push({
      $match: {
        slug,
      },
    });
    return this;
  }

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

  build() {
    return this.pipeline;
  }

  when(condition: boolean, callback: (builder: this) => this) {
    return condition ? callback(this) : this;
  }

  addStage(stage: PipelineStage) {
    this.pipeline.push(stage);
    return this;
  }

  reset() {
    this.pipeline = [];
    return this;
  }

  debug() {
    logger.debug('Pipeline stages:', JSON.stringify(this.pipeline, null, 2));
    return this;
  }

  getPipeline() {
    return [...this.pipeline];
  }
}

export { StoryPipelineBuilder };
