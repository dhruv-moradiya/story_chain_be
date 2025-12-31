import mongoose, { Schema } from 'mongoose';
import { IReportDoc } from '../features/report/report.types';

const reportSchema = new Schema<IReportDoc>(
  {
    reporterId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // What's being reported
    reportType: {
      type: String,
      required: true,
      enum: ['CHAPTER', 'COMMENT', 'USER', 'STORY'],
    },
    relatedChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    relatedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    relatedUserId: { type: String, ref: 'User' },
    relatedStorySlug: { type: String, ref: 'Story' },

    // Report details
    reason: {
      type: String,
      required: true,
      enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT', 'OFF_TOPIC', 'OTHER'],
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Moderation
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: String, ref: 'User' },
    reviewedAt: Date,
    resolution: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1 });

const Report = mongoose.model('Report', reportSchema);

export { Report };
