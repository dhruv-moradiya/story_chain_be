import mongoose, { Schema } from 'mongoose';
import { ICouponDoc } from '@features/coupon/types/coupon.types';
import { COUPON_DISCOUNT_TYPES } from '@features/coupon/types/coupon-enum';

const couponSchema = new Schema<ICouponDoc>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    description: { type: String, maxlength: 300 },

    // Discount
    discountType: { type: String, enum: COUPON_DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },

    // Restrictions
    applicableBundleIds: { type: [Schema.Types.ObjectId], ref: 'CoinBundle', default: [] },
    maxUses: { type: Number, min: 1 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0 },

    // Validity
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },

    // Audit
    createdBy: { type: String, required: true, ref: 'User' },
    updatedBy: { type: String, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
couponSchema.index({ isActive: 1, endDate: 1 });
couponSchema.index({ createdBy: 1 });

const Coupon = mongoose.model<ICouponDoc>('Coupon', couponSchema);

export { Coupon };
