import {
  SupportedCurrency,
  SUPPORTED_CURRENCIES,
} from '@features/coinBundle/types/coinBundle-enum';

enum CoinOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

const COIN_ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export { CoinOrderStatus, COIN_ORDER_STATUSES, SupportedCurrency, SUPPORTED_CURRENCIES };
