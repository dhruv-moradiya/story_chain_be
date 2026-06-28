import { TCoinOrderCurrency } from '@/features/coinOrder/types/coinOrder.types';

interface ICoinOrderCreateRequestDTO {
  userId: string;
  bundleSlug: string;
  currency: TCoinOrderCurrency;
  couponCode?: string;
}

interface ICoinOrderVerifyRequestDTO {
  userId: string;
  coinOrderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export type { ICoinOrderCreateRequestDTO, ICoinOrderVerifyRequestDTO };
