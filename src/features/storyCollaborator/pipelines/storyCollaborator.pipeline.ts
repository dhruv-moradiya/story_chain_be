import { PipelineStage } from 'mongoose';

class StoryCollaboratorPipelineBuilder {
  private pipeline: PipelineStage[] = [];

  // 🔹 reusable user join (without $match)
  private joinUserProfile(asField: string, localVar: string) {
    this.pipeline.push({
      $lookup: {
        from: 'users',
        let: { ref: `$${localVar}` },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$clerkId', '$$ref'] },
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
        as: asField,
      },
    });

    return this;
  }

  // 🔹 match story using slug
  matchStoryBySlug(slug: string) {
    this.pipeline.push({ $match: { slug } });
    return this;
  }

  // 🔹 populate collaborator user
  populatedCollaboratorUser() {
    return this.joinUserProfile('user', 'userId').$setUserRoot(); // convert to object
  }

  // 🔹 populate invitedBy user
  populatedInvitedByUser() {
    return this.joinUserProfile('invitedBy', 'invitedBy').$setInvitedByRoot();
  }

  // 🔻 helpers to convert array → object
  private $setUserRoot() {
    this.pipeline.push({ $unset: 'userId' }, { $set: { user: { $arrayElemAt: ['$user', 0] } } });
    return this;
  }

  private $setInvitedByRoot() {
    this.pipeline.push({
      $set: {
        invitedBy: {
          $ifNull: [{ $arrayElemAt: ['$invitedBy', 0] }, null],
        },
      },
    });
    return this;
  }

  build() {
    return this.pipeline;
  }
}

export { StoryCollaboratorPipelineBuilder };
