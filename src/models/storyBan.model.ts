import mongoose, { Schema } from 'mongoose';
import { IStoryBanDoc } from '@features/storyBan/types/storyBan.types';
import { STORY_BAN_ISSUER_ROLES } from '@features/storyBan/types/storyBan-enum';

const storyBanSchema = new Schema<IStoryBanDoc>(
  {
    storySlug: {
      type: String,
      ref: 'Story',
      required: true,
      index: true,
    },

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
    bannedByRole: {
      type: String,
      enum: STORY_BAN_ISSUER_ROLES, // 'owner' | 'co_author' | 'moderator'
      required: true,
    },

    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    reportId: {
      // The report that triggered this ban (optional)
      type: Schema.Types.ObjectId,
      ref: 'Report',
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      // null = permanent story ban
      type: Date,
      default: null,
      index: true,
    },

    liftedAt: Date,
    liftedBy: {
      type: String,
      ref: 'User',
    },
    liftedReason: String,

    appealId: {
      type: Schema.Types.ObjectId,
      ref: 'Appeal',
    },
  },
  { timestamps: true }
);

// "Is this user currently banned from this story?" — the hot-path query
storyBanSchema.index({ storySlug: 1, userId: 1, isActive: 1 });
// General lookup by user (e.g. show all stories a user is banned from)
storyBanSchema.index({ userId: 1, storySlug: 1 });

export const StoryBan = mongoose.model<IStoryBanDoc>('StoryBan', storyBanSchema);
