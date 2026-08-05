import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IBanHistory, IBanHistoryDoc, IBanHistoryPopulated } from '../types/banHistory.types';
import { BanHistory } from '@/models/banHistory.model';
import { BanHistoryPipelineBuilder } from '../pipelines/BanHistoryPipeline.builder';

@singleton()
export class BanHistoryRepository extends BaseRepository<IBanHistory, IBanHistoryDoc> {
  constructor() {
    super(BanHistory);
  }

  async findActiveBanByUserId(userId: string): Promise<IBanHistoryPopulated | null> {
    const builder = new BanHistoryPipelineBuilder().getActiveBanForUserPreset(userId);
    const results = await this.model.aggregate<IBanHistoryPopulated>(builder.build()).exec();
    return results.length > 0 ? results[0] : null;
  }
}
