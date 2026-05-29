import { Document, Types } from 'mongoose';

// ========================================
// EMBEDDED INTERFACES
// ========================================

export interface IReferralConfig {
  /** Coins awarded to the referrer */
  referrerBonusCoins: number;
  /** Welcome coins for the newly referred user */
  referredBonusCoins: number;
  isActive: boolean;
  /** 0 = never expires */
  rewardExpiryDays: number;
  /** Plain text eligibility note for SUPER_ADMIN */
  eligibilityRules?: string;
}

export interface IStreakBonus {
  streakDays: number;
  bonusCoins: number;
}

export interface IDailyRewardConfig {
  coinsPerDay: number;
  streakBonus: IStreakBonus[];
  isActive: boolean;
}

export interface IRoleShares {
  owner: number;
  co_author: number;
  moderator: number;
  reviewer: number;
  contributor: number;
}

export interface IEarningDistribution {
  /** Platform cut as a percentage (e.g. 20 = 20%) */
  platformFeePercent: number;
  /** Remainder distributed among story collaborators */
  collaboratorPercent: number;
  /** Splits within collaboratorPercent — must sum to 100 */
  roleShares: IRoleShares;
}

export interface IWithdrawalConfig {
  /** Minimum coins needed to request a withdrawal */
  minWithdrawalCoins: number;
  /** Platform cuts this many coins per withdrawal request */
  processingFeeCoin: number;
  isWithdrawalEnabled: boolean;
}

// ========================================
// ROOT MODEL INTERFACE (Singleton)
// ========================================

export interface IPlatformCoinConfig {
  /** Singleton sentinel — always "config". Enforced unique index. */
  _singleton: string;

  referral: IReferralConfig;
  dailyReward: IDailyRewardConfig;
  earningDistribution: IEarningDistribution;
  withdrawal: IWithdrawalConfig;

  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPlatformCoinConfigDoc extends Omit<IPlatformCoinConfig, '_id'>, Document {
  _id: Types.ObjectId;
}
