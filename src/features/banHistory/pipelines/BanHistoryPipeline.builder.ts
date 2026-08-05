import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { attachUserStages, PUBLIC_USER_PROJECTION } from '@/shared/pipelines/stages/user.stages';

/**
 * MongoDB Aggregation Pipeline Builder for BanHistory queries.
 */
export class BanHistoryPipelineBuilder extends BasePipelineBuilder<BanHistoryPipelineBuilder> {
  /**
   * Matches ban history records for a specific target user ID.
   */
  byUserId(userId: string) {
    this.pipeline.push({
      $match: {
        userId,
      },
    });
    return this;
  }

  /**
   * Matches only currently active bans (`isActive: true`).
   */
  activeOnly() {
    this.pipeline.push({
      $match: {
        isActive: true,
      },
    });
    return this;
  }

  /**
   * Attaches details of the user/admin who issued the ban (`bannedBy` -> populated user object).
   */
  attachBannedByUser(project: Record<string, unknown> = PUBLIC_USER_PROJECTION) {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'bannedBy',
        as: 'bannedBy',
        project,
      })
    );
    return this;
  }

  /**
   * Preset to retrieve active ban details for a user along with moderator user information.
   */
  getActiveBanForUserPreset(userId: string) {
    return this.byUserId(userId)
      .activeOnly()
      .attachBannedByUser(PUBLIC_USER_PROJECTION)
      .sortByCreatedAt(-1)
      .limit(1);
  }
}
