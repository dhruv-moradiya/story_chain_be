import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { attachUserStages, PUBLIC_USER_PROJECTION } from '@/shared/pipelines/stages/user.stages';

export class StoryBanPipelineBuilder extends BasePipelineBuilder<StoryBanPipelineBuilder> {
  /**
   * Attaches details of the user/admin who issued the ban (`bannedBy` -> populated user object).
   */
  attachBannedByUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION): this {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'bannedBy',
        as: 'bannedBy',
        project,
      })
    );
    return this;
  }

  checkUserStoryBanPreset(storySlug: string, userId: string): this {
    this.addStage({
      $match: {
        storySlug,
        userId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    })
      .attachBannedByUser()
      .project({
        _id: 1,
        storySlug: 1,
        userId: 1,
        bannedBy: 1,
        bannedByRole: 1,
        reason: 1,
        reportId: 1,
        isActive: 1,
        expiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
      });
    return this;
  }
}
