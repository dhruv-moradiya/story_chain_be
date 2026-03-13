import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';

class StoryCollaboratorPipelineBuilder extends BasePipelineBuilder<StoryCollaboratorPipelineBuilder> {
  // ─── Private reusable joins ───────────────────────────────────────────────

  /**
   * Reusable $lookup that joins user profile fields from the `users` collection.
   * @param asField  - The output array field name
   * @param localVar - The local document field holding the clerkId reference
   */
  private joinUserProfile(asField: string, localVar: string) {
    return this.addStage({
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
  }

  // ─── Match stages ─────────────────────────────────────────────────────────

  /** Matches collaborator documents by story slug. */
  matchStoryBySlug(slug: string) {
    return this.matchField('slug', slug);
  }

  // ─── Populate stages ──────────────────────────────────────────────────────

  /** Joins collaborator user profile and converts the result array to a single object. */
  populatedCollaboratorUser() {
    return this.joinUserProfile('user', 'userId').addStages([
      { $unset: 'userId' },
      { $set: { user: { $arrayElemAt: ['$user', 0] } } },
    ]);
  }

  /** Joins invitedBy user profile and converts the result array to a single object (nullable). */
  populatedInvitedByUser() {
    return this.joinUserProfile('invitedBy', 'invitedBy').addStage({
      $set: {
        invitedBy: {
          $ifNull: [{ $arrayElemAt: ['$invitedBy', 0] }, null],
        },
      },
    });
  }
}

export { StoryCollaboratorPipelineBuilder };
