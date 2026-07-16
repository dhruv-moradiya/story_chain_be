import { TDistributeCoinsSchema } from '@/schema/request/storyEarningsPool.schema';

export interface IDistributeCoinsDTO {
  slug: string;
  userId: string;
  distributions: TDistributeCoinsSchema;
}

export interface IGetStoryEarningsPoolDTO {
  slug: string;
  userId: string;
}
