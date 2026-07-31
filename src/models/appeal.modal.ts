import mongoose, { Schema } from 'mongoose';
import { IAppealDoc } from '@features/appeal/types/appeal.types';
import {
  APPEAL_PRIORITIES,
  APPEAL_REVIEW_DECISIONS,
  APPEAL_SCOPES,
  APPEAL_STATUSES,
  AppealStatus,
  AppealPriority,
} from '@features/appeal/types/appeal-enum';

const appealSchema = new Schema<IAppealDoc>(
  {
    appealScope: {
      type: String,
      enum: APPEAL_SCOPES,
      required: true,
      index: true,
    },

    // Appellant
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // Target (platform scope)
    banHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BanHistory',
      // Required only when appealScope === 'PLATFORM' (enforced via pre-validate)
      index: true,
    },

    // Target (story scope)
    storyBanId: {
      type: Schema.Types.ObjectId,
      ref: 'StoryBan',
      // Required only when appealScope === 'STORY' (enforced via pre-validate)
      index: true,
    },
    storySlug: {
      type: String,
      ref: 'Story',
      // Required only when appealScope === 'STORY'
      index: true,
    },

    // Appeal content
    appealReason: {
      type: String,
      required: true,
      maxlength: 200,
    },
    explanation: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 2000,
    },
    evidenceUrls: [String],

    // Status & priority
    status: {
      type: String,
      enum: APPEAL_STATUSES,
      default: AppealStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: APPEAL_PRIORITIES,
      default: AppealPriority.NORMAL,
      index: true,
    },

    // Assignment (platform scope only)
    assignedTo: {
      type: String,
      ref: 'User',
      index: true,
    },
    assignedAt: Date,

    reviewedBy: {
      type: String,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewDecision: {
      type: String,
      // Past-tense matches the terminal AppealStatus values
      enum: APPEAL_REVIEW_DECISIONS,
    },
    reviewNotes: String,
    internalNotes: String,

    // Escalation
    escalatedTo: {
      type: String,
      ref: 'User',
    },
    escalatedAt: Date,
    escalationReason: String,

    // Response to appellant
    responseMessage: String,

    // Metrics
    responseTimeMs: Number,
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

appealSchema.index({ status: 1, priority: -1, createdAt: 1 });
appealSchema.index({ assignedTo: 1, status: 1 });
appealSchema.index({ appealScope: 1, status: 1 });
appealSchema.index({ userId: 1, banHistoryId: 1, status: 1 }); // open-appeal duplicate check
appealSchema.index({ userId: 1, storyBanId: 1, status: 1 }); // open-appeal duplicate check

appealSchema.pre('validate', function (next) {
  const hasPlatform = !!this.banHistoryId;
  const hasStory = !!this.storyBanId && !!this.storySlug;

  if (this.appealScope === 'PLATFORM' && !hasPlatform) {
    return next(new Error('banHistoryId is required for PLATFORM appeals'));
  }
  if (this.appealScope === 'STORY' && !hasStory) {
    return next(new Error('storyBanId and storySlug are required for STORY appeals'));
  }
  next();
});

export const Appeal = mongoose.model<IAppealDoc>('Appeal', appealSchema);
