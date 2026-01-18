import mongoose, { Schema } from 'mongoose';
import { IFollowDoc } from '@features/follow/types/follow.types';

const followSchema = new Schema<IFollowDoc>({
  followerId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  followingId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique: can't follow same person twice
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

const Follow = mongoose.model('Follow', followSchema);

export { Follow };
