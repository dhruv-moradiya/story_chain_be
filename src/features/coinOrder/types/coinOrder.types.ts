import { Document, Types } from 'mongoose';
import { ID } from '@/types';
import {
  COIN_ORDER_STATUSES,
  SUPPORTED_CURRENCIES,
  CoinOrderStatus,
  SupportedCurrency,
} from './coinOrder-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TCoinOrderStatus = (typeof COIN_ORDER_STATUSES)[number];
export type TCoinOrderCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface ICoinOrder {
  _id: ID;
  userId: string;
  bundleSlug: string;

  // What they're getting
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;

  // Pricing
  currency: TCoinOrderCurrency;
  /** Amount in smallest unit — paise (INR) or cents (USD) */
  originalAmount: number;
  discountAmount: number;
  /** originalAmount - discountAmount */
  finalAmount: number;
  couponId?: ID;
  /** Snapshot of coupon code at time of purchase */
  couponCode?: string;

  // Razorpay
  /** order_xxxxxxxx — returned by Razorpay Orders API */
  razorpayOrderId: string;
  /** pay_xxxxxxxx — set after successful payment */
  razorpayPaymentId?: string;
  /** HMAC signature from Razorpay webhook */
  razorpaySignature?: string;

  // Status
  status: TCoinOrderStatus;

  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinOrderDoc extends Omit<ICoinOrder, '_id' | 'couponId'>, Document {
  _id: Types.ObjectId;
  couponId?: Types.ObjectId;
}

export { CoinOrderStatus, SupportedCurrency };
