enum CoinTxType {
  // Credits
  PURCHASE = 'purchase',
  CHAPTER_EARN = 'chapter_earn',
  REFERRAL_REWARD = 'referral_reward',
  DAILY_REWARD = 'daily_reward',
  ADMIN_CREDIT = 'admin_credit',

  // Debits
  CHAPTER_UNLOCK = 'chapter_unlock',
  WITHDRAWAL = 'withdrawal',
  ADMIN_DEBIT = 'admin_debit',
}

const COIN_TX_TYPES = [
  'purchase',
  'chapter_earn',
  'referral_reward',
  'daily_reward',
  'admin_credit',
  'chapter_unlock',
  'withdrawal',
  'admin_debit',
] as const;

enum CoinTxDirection {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

const COIN_TX_DIRECTIONS = ['credit', 'debit'] as const;

export { CoinTxType, COIN_TX_TYPES, CoinTxDirection, COIN_TX_DIRECTIONS };
