import { Document, Types } from 'mongoose';
import { ID, IImageAsset } from '@/types';
import {
  BUNDLE_TYPES,
  RESTRICTION_TYPES,
  SUPPORTED_CURRENCIES,
  BundleType,
  RestrictionType,
  SupportedCurrency,
} from './coinBundle-enum';

// ========================================
// DERIVED TYPES
// ========================================

export type TBundleType = (typeof BUNDLE_TYPES)[number];
export type TRestrictionType = (typeof RESTRICTION_TYPES)[number];
export type TSupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// ========================================
// EMBEDDED INTERFACES
// ========================================

export interface IBundleRestrictions {
  type: TRestrictionType;
  dailyLimit?: number;
  monthlyLimit?: number;
  lifetimeLimit?: number;
  /** Welcome Pack — only users with zero prior purchases can buy */
  firstPurchaseOnly: boolean;
  perUserLimit?: number;
}

// ========================================
// ROOT MODEL INTERFACE
// ========================================

export interface ICoinBundle {
  _id: ID;

  // Identity
  name: string;
  slug: string;
  description?: string;
  bundleType: TBundleType;

  // Coins
  baseCoins: number;
  bonusCoins: number;
  /** Always baseCoins + bonusCoins — computed by pre-save hook */
  totalCoins: number;

  // Pricing
  /** INR in paise — 100000 = ₹1000 */
  inrPrice: number;
  /** USD in cents — 1200 = $12.00 */
  usdPrice: number;
  currencies: TSupportedCurrency[];

  // Display
  thumbnail?: IImageAsset;
  isFeatured: boolean;
  isPopular: boolean;
  displayOrder: number;
  promotionalBadge?: string;
  marketingTagline?: string;

  // Visibility & Lifecycle
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  startDate?: Date;
  endDate?: Date;
  /** HH:mm:ss local time window start */
  startTime?: string;
  /** HH:mm:ss local time window end */
  endTime?: string;
  timezone: string;

  // Purchase Restrictions
  restrictions: IBundleRestrictions;

  // Audit
  createdBy: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICoinBundleDoc extends Omit<ICoinBundle, '_id'>, Document {
  _id: Types.ObjectId;
}

export { BundleType, RestrictionType, SupportedCurrency };
