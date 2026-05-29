import mongoose, { Schema } from 'mongoose';
import { IPlatformCoinConfigDoc } from '@features/platformCoinConfig/types/platformCoinConfig.types';

// ── Streak Bonus sub-schema ───────────────────────────────────────────────────
const streakBonusSchema = new Schema(
  {
    streakDays: { type: Number, required: true },
    bonusCoins: { type: Number, required: true },
  },
  { _id: false }
);

// ── Role Shares sub-schema ────────────────────────────────────────────────────
const roleSharesSchema = new Schema(
  {
    owner: { type: Number, default: 50 },
    co_author: { type: Number, default: 25 },
    moderator: { type: Number, default: 10 },
    reviewer: { type: Number, default: 10 },
    contributor: { type: Number, default: 5 },
  },
  { _id: false }
);

// ── Root Schema ───────────────────────────────────────────────────────────────
const platformCoinConfigSchema = new Schema<IPlatformCoinConfigDoc>(
  {
    // Singleton sentinel
    _singleton: { type: String, default: 'config', unique: true },

    // Referral Rewards
    referral: {
      referrerBonusCoins: { type: Number, default: 50 },
      referredBonusCoins: { type: Number, default: 25 },
      isActive: { type: Boolean, default: true },
      rewardExpiryDays: { type: Number, default: 30 },
      eligibilityRules: { type: String, maxlength: 500 },
    },

    // Daily Reward
    dailyReward: {
      coinsPerDay: { type: Number, default: 5 },
      streakBonus: { type: [streakBonusSchema], default: [] },
      isActive: { type: Boolean, default: true },
    },

    // Earning Distribution
    earningDistribution: {
      platformFeePercent: { type: Number, default: 20 },
      collaboratorPercent: { type: Number, default: 80 },
      roleShares: { type: roleSharesSchema, default: () => ({}) },
    },

    // Withdrawal Settings
    withdrawal: {
      minWithdrawalCoins: { type: Number, default: 500 },
      processingFeeCoin: { type: Number, default: 0 },
      isWithdrawalEnabled: { type: Boolean, default: true },
    },

    updatedBy: { type: String, ref: 'User' },
  },
  { timestamps: true }
);

const PlatformCoinConfig = mongoose.model<IPlatformCoinConfigDoc>(
  'PlatformCoinConfig',
  platformCoinConfigSchema
);

export { PlatformCoinConfig };
