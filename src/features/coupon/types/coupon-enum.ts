enum CouponDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_INR = 'fixed_inr',
  BONUS_COINS = 'bonus_coins',
}

const COUPON_DISCOUNT_TYPES = ['percentage', 'fixed_inr', 'bonus_coins'] as const;

export { CouponDiscountType, COUPON_DISCOUNT_TYPES };
