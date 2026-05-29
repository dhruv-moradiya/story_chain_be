import mongoose, { Schema } from 'mongoose';
import { ICoinBundleDoc } from '@features/coinBundle/types/coinBundle.types';
import {
  BUNDLE_TYPES,
  RESTRICTION_TYPES,
  SUPPORTED_CURRENCIES,
} from '@features/coinBundle/types/coinBundle-enum';
import { ImageAssetSchema } from '@/models/shared/imageAsset.schema';

const restrictionsSchema = new Schema(
  {
    type: { type: String, enum: RESTRICTION_TYPES, default: 'unlimited' },
    dailyLimit: { type: Number, min: 1 },
    monthlyLimit: { type: Number, min: 1 },
    lifetimeLimit: { type: Number, min: 1 },
    firstPurchaseOnly: { type: Boolean, default: false },
    perUserLimit: { type: Number, min: 1 },
  },
  { _id: false }
);

const coinBundleSchema = new Schema<ICoinBundleDoc>(
  {
    // Identity
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 500 },
    bundleType: { type: String, enum: BUNDLE_TYPES, required: true, index: true },

    // Coins
    baseCoins: { type: Number, required: true, min: 1 },
    bonusCoins: { type: Number, default: 0, min: 0 },
    totalCoins: { type: Number, required: true }, // set by pre-save hook

    // Pricing
    inrPrice: { type: Number, required: true, min: 0 },
    usdPrice: { type: Number, default: 0, min: 0 },
    currencies: { type: [String], enum: SUPPORTED_CURRENCIES, default: ['INR'] },

    // Display
    thumbnail: ImageAssetSchema,
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    promotionalBadge: { type: String, maxlength: 50 },
    marketingTagline: { type: String, maxlength: 150 },

    // Visibility & Lifecycle
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String, ref: 'User' },
    startDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: String, maxlength: 8 },
    endTime: { type: String, maxlength: 8 },
    timezone: { type: String, default: 'Asia/Kolkata' },

    // Purchase Restrictions
    restrictions: { type: restrictionsSchema, default: () => ({}) },

    // Audit
    createdBy: { type: String, required: true, ref: 'User' },
    updatedBy: { type: String, ref: 'User' },
  },
  { timestamps: true }
);

// Pre-save hook: totalCoins = baseCoins + bonusCoins
coinBundleSchema.pre('save', function (next) {
  this.totalCoins = this.baseCoins + this.bonusCoins;
  next();
});

// Pre-update hook for findOneAndUpdate paths
coinBundleSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
  if (update['$set']) {
    const set = update['$set'] as Record<string, number>;
    if (set['baseCoins'] !== undefined || set['bonusCoins'] !== undefined) {
      // Defer to application layer — recalc in service before calling update
    }
  }
  next();
});

// Indexes
coinBundleSchema.index({ isActive: 1, isDeleted: 1, displayOrder: 1 }); // public listing
coinBundleSchema.index({ startDate: 1, endDate: 1 }); // scheduled bundles

const CoinBundle = mongoose.model<ICoinBundleDoc>('CoinBundle', coinBundleSchema);

export { CoinBundle };
