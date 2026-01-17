import { PipelineStage } from 'mongoose';
import { ID } from '@/types';
import { IStorySettings } from '../types/story.types';
import { StoryCollaboratorStatus } from '@/features/storyCollaborator/types/storyCollaborator-enum';

class StoryPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  lastSevenDaysStories() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    this.pipeline.push({
      $match: {
        createdAt: { $gte: sevenDaysAgo, $lt: new Date() },
      },
    });
    return this;
  }

  storyById(storyId: ID) {
    this.pipeline.push({
      $match: {
        _id: storyId,
      },
    });
    return this;
  }

  storyBySlug(slug: string) {
    this.pipeline.push({
      $match: {
        slug,
      },
    });
    return this;
  }

  storySettings(keys: (keyof IStorySettings)[]) {
    const fields: Partial<Record<keyof IStorySettings, string>> = {};

    keys.forEach((element) => {
      fields[element] = `$settings.${element}`;
    });

    this.pipeline.push({
      $set: fields,
    });

    return this;
  }

  withStoryCreator() {
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

  withStoryCollaborators() {
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
}

export { StoryPipelineBuilder };
