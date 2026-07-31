import mongoose, { Schema } from 'mongoose';
import { IBanHistoryDoc } from '@features/banHistory/types/banHistory.types';
import { BAN_TYPES } from '@features/banHistory/types/banHistory-enum';

const banHistorySchema = new Schema<IBanHistoryDoc>(
  {
    //  Who was banned
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    bannedBy: {
      type: String,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
    },

    banType: {
      type: String,
      enum: BAN_TYPES,
      required: true,
    },
    durationDays: Number,
    expiresAt: {
      type: Date,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    liftedAt: Date,
    liftedBy: {
      type: String,
      ref: 'User',
    },
    liftedReason: String,

    evidenceUrls: [String],
    internalNotes: String,
  },
  { timestamps: true }
);

banHistorySchema.index({ userId: 1, isActive: 1 });
banHistorySchema.index({ isActive: 1, expiresAt: 1 });

export const BanHistory = mongoose.model<IBanHistoryDoc>('BanHistory', banHistorySchema);
