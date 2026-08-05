import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { StoryBan } from '@/models/storyBan.model';
import { IStoryBan, IStoryBanDoc, IStoryBanPopulated } from '../types/storyBan.types';
import { Types } from 'mongoose';
import { StoryBanPipelineBuilder } from '../pipelines/storyBan.pipeline';
import { IStoryBanStatusResponse } from '@/types/response/storyBan.response.types';

@singleton()
export class StoryBanRepository extends BaseRepository<IStoryBan, IStoryBanDoc> {
  constructor() {
    super(StoryBan);
  }

  async banUserFromStory(input: {
    storySlug: string;
    userId: string;
    bannedBy: string;
    bannedByRole?: string;
    reason: string;
    reportId?: string | Types.ObjectId;
    expiresAt?: Date | null;
  }): Promise<IStoryBan | null> {
    return this.model
      .findOneAndUpdate(
        { storySlug: input.storySlug, userId: input.userId },
        {
          storySlug: input.storySlug,
          userId: input.userId,
          bannedBy: input.bannedBy,
          bannedByRole: input.bannedByRole ?? 'moderator',
          reason: input.reason,
          reportId: input.reportId,
          isActive: true,
          expiresAt: input.expiresAt ?? null,
        },
        { upsert: true, new: true }
      )
      .lean<IStoryBan>()
      .exec();
  }

  async unbanUserFromStory(
    storySlug: string,
    userId: string,
    liftedBy?: string,
    liftedReason?: string
  ): Promise<IStoryBan | null> {
    return this.model
      .findOneAndUpdate(
        { storySlug, userId },
        {
          isActive: false,
          liftedAt: new Date(),
          ...(liftedBy && { liftedBy }),
          ...(liftedReason && { liftedReason }),
        },
        { new: true }
      )
      .lean<IStoryBan>()
      .exec();
  }

  async findActiveBan(storySlug: string, userId: string): Promise<IStoryBan | null> {
    return this.model
      .findOne({
        storySlug,
        userId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
      .lean<IStoryBan>()
      .exec();
  }

  async checkUserBanWithPipeline(
    storySlug: string,
    userId: string
  ): Promise<IStoryBanStatusResponse> {
    const builder = new StoryBanPipelineBuilder().checkUserStoryBanPreset(storySlug, userId);
    const results = await this.model.aggregate<IStoryBanPopulated>(builder.build()).exec();

    if (results.length > 0) {
      return {
        isBanned: true,
        banDetails: results[0],
      };
    }

    return {
      isBanned: false,
      banDetails: null,
    };
  }
}
