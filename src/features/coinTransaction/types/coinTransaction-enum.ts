enum CoinTxType {
  // Credits
  PURCHASE = 'purchase',
  CHAPTER_EARN = 'chapter_earn',
  REFERRAL_REWARD = 'referral_reward',
  DAILY_REWARD = 'daily_reward',
  ADMIN_CREDIT = 'admin_credit',

  /**
   * Coins credited to the per-story earnings pool (StoryEarningsPool) after a chapter unlock.
   * userId is set to the story owner — direction: credit.
   */
  STORY_POOL_CREDIT = 'story_pool_credit',

  /**
   * Platform's cut from a chapter unlock — recorded against PLATFORM_SYSTEM_USER_ID.
   * This is an accounting-only entry; no real wallet is modified.
   * direction: credit.
   */
  PLATFORM_FEE = 'platform_fee',

  /**
   * Coins distributed from the StoryEarningsPool to a collaborator's wallet.
   * direction: credit (for the collaborator receiving the payout).
   */
  EARNINGS_DISTRIBUTION = 'earnings_distribution',

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
  'story_pool_credit',
  'platform_fee',
  'earnings_distribution',
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
