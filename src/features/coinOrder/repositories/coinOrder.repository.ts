import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { CoinOrder } from '@models/coinOrder.model';
import { ICoinOrder, ICoinOrderDoc } from '../types/coinOrder.types';

@singleton()
export class CoinOrderRepository extends BaseRepository<ICoinOrder, ICoinOrderDoc> {
  constructor() {
    super(CoinOrder);
  }
}
