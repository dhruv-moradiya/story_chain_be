import { PipelineStage } from 'mongoose';
import { ID } from '../../../types';
import { ObjectId } from 'mongodb';

class StoryCollaboratorPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  allCollaboratorDetails(storyId: ID) {
    this.pipeline.push(
      {
        $match: {
          storyId: new ObjectId(storyId),
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$clerkId', '$$uid'] },
              },
            },
            {
              $project: {
                email: 1,
                username: 1,
                avatarUrl: 1,
                clerkId: 1,
              },
            },
          ],
          as: 'user',
        },
      },
      { $unset: 'userId' },
      {
        $set: {
          user: { $arrayElemAt: ['$user', 0] },
        },
      }
    );

    return this; // allow chaining
  }

  build() {
    return this.pipeline;
  }
}

export { StoryCollaboratorPipelineBuilder };
