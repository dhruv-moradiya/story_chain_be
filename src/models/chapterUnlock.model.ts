import mongoose, { Schema } from 'mongoose';
import { IChapterUnlockDoc } from '@features/chapterUnlock/types/chapterUnlock.types';

const chapterUnlockSchema = new Schema<IChapterUnlockDoc>(
  {
    userId: { type: String, required: true, ref: 'User' },
    chapterSlug: { type: String, required: true },
    storySlug: { type: String, required: true },

    /** Snapshot of coins paid — coinPrice can change later, this preserves history */
    coinsPaid: { type: Number, required: true, min: 0 },

    /** The CoinTransaction that debited the coins for this unlock */
    transactionId: { type: Schema.Types.ObjectId, required: true, ref: 'CoinTransaction' },

    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent a user from unlocking the same chapter twice
chapterUnlockSchema.index({ userId: 1, chapterSlug: 1 }, { unique: true });

// Primary query: "which chapters in this story has this user unlocked?" (used when building chapter list)
chapterUnlockSchema.index({ userId: 1, storySlug: 1 });

// Secondary: "who has unlocked this chapter?" (analytics / earnings distribution)
chapterUnlockSchema.index({ chapterSlug: 1 });

const ChapterUnlock = mongoose.model<IChapterUnlockDoc>('ChapterUnlock', chapterUnlockSchema);

export { ChapterUnlock };
