import mongoose, { Schema } from 'mongoose';
import { IPlatformRoleDoc } from '../features/platformRole/platformRole.types';

const platformRoleSchema = new Schema<IPlatformRoleDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'PLATFORM_MODERATOR', 'APPEAL_MODERATOR', 'USER'],
      default: 'USER',
      index: true,
    },
    permissions: {
      // Platform moderation
      canBanUsers: { type: Boolean, default: false },
      canUnbanUsers: { type: Boolean, default: false },
      canViewAllReports: { type: Boolean, default: false },
      canDeleteAnyContent: { type: Boolean, default: false },

      // Appeals
      canReviewAppeals: { type: Boolean, default: false },
      canApproveAppeals: { type: Boolean, default: false },
      canRejectAppeals: { type: Boolean, default: false },
      canEscalateAppeals: { type: Boolean, default: false },

      // Role management
      canManageRoles: { type: Boolean, default: false },
      canAssignModerators: { type: Boolean, default: false },

      // Administration
      canAccessAdminPanel: { type: Boolean, default: false },
      canViewPlatformAnalytics: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
      canManageFeaturedContent: { type: Boolean, default: false },
    },
    assignedBy: Schema.Types.ObjectId,
    assignedAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PlatformRole = mongoose.model<IPlatformRoleDoc>('PlatformRole', platformRoleSchema);
