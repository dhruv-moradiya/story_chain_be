import { TCoinOrderCurrency } from '@/features/coinOrder/types/coinOrder.types';

interface ICoinOrderCreateRequestDTO {
  userId: string;
  bundleSlug: string;
  currency: TCoinOrderCurrency;
  couponCode?: string;
}

export type { ICoinOrderCreateRequestDTO };
