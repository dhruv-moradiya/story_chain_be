import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IBanHistory, IBanHistoryDoc } from '../types/banHistory.types';
import { BanHistory } from '@/models/banHistory.model';

@singleton()
export class BanHistoryRepository extends BaseRepository<IBanHistory, IBanHistoryDoc> {
  constructor() {
    super(BanHistory);
  }
}
