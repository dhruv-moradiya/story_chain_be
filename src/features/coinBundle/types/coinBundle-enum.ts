enum BundleType {
  STANDARD = 'standard',
  SEASONAL = 'seasonal',
  FESTIVAL = 'festival',
  LIMITED_TIME = 'limited_time',
  LAUNCH_EVENT = 'launch_event',
  ANNIVERSARY = 'anniversary',
  CREATOR_PARTNERSHIP = 'creator_partnership',
  FLASH_SALE = 'flash_sale',
  FIRST_PURCHASE = 'first_purchase',
  REFERRAL_REWARD = 'referral_reward',
}

const BUNDLE_TYPES = [
  'standard',
  'seasonal',
  'festival',
  'limited_time',
  'launch_event',
  'anniversary',
  'creator_partnership',
  'flash_sale',
  'first_purchase',
  'referral_reward',
] as const;

enum RestrictionType {
  UNLIMITED = 'unlimited',
  ONE_TIME = 'one_time',
  DAILY = 'daily',
  MONTHLY = 'monthly',
  LIFETIME = 'lifetime',
}

const RESTRICTION_TYPES = ['unlimited', 'one_time', 'daily', 'monthly', 'lifetime'] as const;

enum SupportedCurrency {
  INR = 'INR',
  USD = 'USD',
}

const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;

export {
  BundleType,
  BUNDLE_TYPES,
  RestrictionType,
  RESTRICTION_TYPES,
  SupportedCurrency,
  SUPPORTED_CURRENCIES,
};
