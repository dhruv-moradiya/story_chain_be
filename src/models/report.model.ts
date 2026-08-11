import mongoose, { Schema } from 'mongoose';
import { IReportDoc } from '@features/report/types/report.types';
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TYPES,
  REPORT_ACTIONS_TAKEN,
  ReportStatus,
  ReportGovernanceLevel,
} from '@/features/report/types/report-enum';

const reportSchema = new Schema<IReportDoc>(
  {
    // Who filed it
    reporterId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    //  What is being reported
    reportType: {
      type: String,
      required: true,
      enum: REPORT_TYPES,
    },
    relatedChapterSlug: { type: String, ref: 'Chapter' },
    relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    relatedUserId: { type: String, ref: 'User' },
    relatedStorySlug: { type: String, ref: 'Story' },

    // Routing
    // STORY  → story owner/co_author/moderator handles first (not for STORY/USER report types)
    // PLATFORM → PLATFORM_MODERATOR / SUPER_ADMIN handles
    // reportType STORY and USER always set this to PLATFORM
    governanceLevel: {
      type: String,
      enum: Object.values(ReportGovernanceLevel),
      required: true,
      index: true,
    },

    // Report content
    reason: {
      type: String,
      required: true,
      enum: REPORT_REASONS,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },

    // Status & Workflow
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: ReportStatus.PENDING,
      index: true,
    },

    // Who first opened the report (PENDING → UNDER_REVIEW)
    openedBy: { type: String, ref: 'User' },
    openedAt: Date,

    // Who resolved or dismissed the report (distinct from who opened it)
    resolvedBy: { type: String, ref: 'User' },
    resolvedAt: Date,
    resolution: { type: String, maxlength: 1000 },
    actionTaken: {
      type: String,
      enum: REPORT_ACTIONS_TAKEN,
    },

    // Escalation
    escalatedTo: { type: String, ref: 'User' },
    escalatedAt: Date,
    escalationReason: { type: String, maxlength: 500 },

    // Resulting ban links (set when a ban is issued from this report)
    storyBanId: { type: Schema.Types.ObjectId, ref: 'StoryBan' },
    banHistoryId: { type: Schema.Types.ObjectId, ref: 'BanHistory' },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ governanceLevel: 1, status: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, status: 1, createdAt: -1 });
reportSchema.index({ reason: 1, status: 1, createdAt: -1 });
reportSchema.index({ relatedStorySlug: 1, governanceLevel: 1, status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, status: 1, createdAt: -1 });

// Prevent a single user from spamming the same target
reportSchema.index({ reporterId: 1, relatedChapterSlug: 1 });
reportSchema.index({ reporterId: 1, relatedCommentId: 1 });
reportSchema.index({ reporterId: 1, relatedUserId: 1 });
reportSchema.index({ reporterId: 1, relatedStorySlug: 1 });

const Report = mongoose.model<IReportDoc>('Report', reportSchema);

export { Report };
