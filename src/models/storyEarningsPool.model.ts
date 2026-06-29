import mongoose, { Schema } from 'mongoose';
import { IStoryEarningsPoolDoc } from '@/features/storyEarningsPool/types/storyEarningsPool.type';

const storyEarningsPoolSchema = new Schema<IStoryEarningsPoolDoc>(
  {
    storySlug: {
      type: String,
      required: true,
    },
    storyOwnerId: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
    },
    totalDistributed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const StoryEarningsPool = mongoose.model<IStoryEarningsPoolDoc>(
  'StoryEarningsPool',
  storyEarningsPoolSchema
);

storyEarningsPoolSchema.index({ storySlug: 1 }, { unique: true, sparse: true });
storyEarningsPoolSchema.index({ storyOwnerId: 1 }, { sparse: true });

export { StoryEarningsPool };
