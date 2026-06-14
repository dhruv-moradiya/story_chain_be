import mongoose, { Schema } from 'mongoose';
import { ICoinOrderDoc } from '@features/coinOrder/types/coinOrder.types';
import {
  COIN_ORDER_STATUSES,
  SUPPORTED_CURRENCIES,
} from '@features/coinOrder/types/coinOrder-enum';

const coinOrderSchema = new Schema<ICoinOrderDoc>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    bundleSlug: { type: String, required: true, ref: 'CoinBundle' },

    // What they're getting
    baseCoins: { type: Number, required: true },
    bonusCoins: { type: Number, required: true },
    totalCoins: { type: Number, required: true },

    // Pricing
    currency: { type: String, enum: SUPPORTED_CURRENCIES, required: true },
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String },

    // Razorpay
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Status
    status: {
      type: String,
      enum: COIN_ORDER_STATUSES,
      default: 'pending',
      index: true,
    },

    paidAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// Indexes
coinOrderSchema.index({ userId: 1, createdAt: -1 });

const CoinOrder = mongoose.model<ICoinOrderDoc>('CoinOrder', coinOrderSchema);

export { CoinOrder };
