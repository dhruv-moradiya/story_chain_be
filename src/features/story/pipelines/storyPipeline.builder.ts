import { PipelineStage } from 'mongoose';
import { ID } from '../../../types';
import { IStorySettings } from '../story.types';

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

  build() {
    return this.pipeline;
  }
}

export { StoryPipelineBuilder };
