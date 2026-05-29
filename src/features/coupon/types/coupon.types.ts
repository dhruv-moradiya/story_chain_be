import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import { COUPON_DISCOUNT_TYPES, CouponDiscountType } from './coupon-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TCouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface ICoupon {
  _id: ID;

  code: string;
  description?: string;

  // Discount
  discountType: TCouponDiscountType;
  /**
   * percentage → 10 means 10% off
   * fixed_inr  → 50 means ₹50 off
   * bonus_coins → 100 means +100 bonus coins
   */
  discountValue: number;

  // Restrictions
  /** Empty array = applies to all bundles */
  applicableBundleIds: ID[];
  maxUses?: number;
  perUserLimit: number;
  /** Denormalized total uses across all users */
  usedCount: number;

  // Validity
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;

  // Audit
  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICouponDoc extends Omit<ICoupon, '_id' | 'applicableBundleIds'>, Document {
  _id: Types.ObjectId;
  applicableBundleIds: Types.Array<Types.ObjectId>;
}

export { CouponDiscountType };
