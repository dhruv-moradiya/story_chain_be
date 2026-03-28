import mongoose, { Schema } from 'mongoose';
import { IPRTimelineDoc } from '@features/prTimeline/types/prTimeline.types';
import { PR_TIMELINE_ACTIONS } from '@features/pullRequest/types/pullRequest-enum';

const prTimelineSchema = new Schema<IPRTimelineDoc>(
  {
    pullRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PullRequest',
      required: true,
      index: true,
    },
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: PR_TIMELINE_ACTIONS,
      required: true,
      index: true,
    },
    performedBy: {
      type: String,
      ref: 'User',
      default: null,
      index: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // we use performedAt as authoritative time
  }
);

// Indexes
prTimelineSchema.index({ pullRequestId: 1, performedAt: 1 }); // full PR event log, chronological
prTimelineSchema.index({ storySlug: 1, performedAt: -1 }); // story-level activity feed
prTimelineSchema.index({ pullRequestId: 1, action: 1, performedAt: -1 }); // filter by action type
prTimelineSchema.index({ performedBy: 1, performedAt: -1 }); // user activity feed

const PRTimeline = mongoose.model<IPRTimelineDoc>('PRTimeline', prTimelineSchema);

export { PRTimeline };
