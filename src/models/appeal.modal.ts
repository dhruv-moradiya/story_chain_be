import mongoose, { Schema } from 'mongoose';

const appealSchema = new Schema(
  {
    banHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BanHistory',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

    // Status tracking
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'],
      default: 'PENDING',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
      index: true,
    },

    // Assignment
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: Date,

    // Review
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewDecision: {
      type: String,
      enum: ['APPROVE', 'REJECT', 'ESCALATE'],
    },
    reviewNotes: String,
    internalNotes: String,

    // Escalation
    escalatedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    escalatedAt: Date,
    escalationReason: String,

    // Response
    responseMessage: String,

    // Metrics
    responseTime: Number,
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appealSchema.index({ status: 1, priority: -1, createdAt: 1 });
appealSchema.index({ assignedTo: 1, status: 1 });

export const Appeal = mongoose.model('Appeal', appealSchema);
