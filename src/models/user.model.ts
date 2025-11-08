import mongoose, { Schema } from 'mongoose';
import { IUserDoc } from '../features/user/user.types';

const userSchema = new Schema<IUserDoc>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    // Profile
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },

    // Gamification
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    badges: [
      {
        type: String,
        enum: [
          'STORY_STARTER',
          'BRANCH_CREATOR',
          'TOP_CONTRIBUTOR',
          'MOST_UPVOTED',
          'TRENDING_AUTHOR',
          'VETERAN_WRITER',
          'COMMUNITY_FAVORITE',
          'COLLABORATIVE',
          'QUALITY_CURATOR',
        ],
      },
    ],

    // Statistics
    stats: {
      storiesCreated: { type: Number, default: 0 },
      chaptersWritten: { type: Number, default: 0 },
      totalUpvotes: { type: Number, default: 0 },
      totalDownvotes: { type: Number, default: 0 },
      branchesCreated: { type: Number, default: 0 },
    },

    // Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: String,
    bannedUntil: Date,

    // Timestamps
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    // delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Indexes
userSchema.index({ xp: -1 });
userSchema.index({ 'stats.totalUpvotes': -1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model<IUserDoc>('User', userSchema);

export { User };
