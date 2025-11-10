import mongoose, { Document, Types } from 'mongoose';

export interface IPlatformRole {
  userId: mongoose.Types.ObjectId;
  role: 'SUPER_ADMIN' | 'PLATFORM_MODERATOR' | 'APPEAL_MODERATOR' | 'USER';
  permissions: {
    // Platform-wide moderation
    canBanUsers: boolean;
    canUnbanUsers: boolean;
    canViewAllReports: boolean;
    canDeleteAnyContent: boolean;

    // Appeals system
    canReviewAppeals: boolean;
    canApproveAppeals: boolean;
    canRejectAppeals: boolean;
    canEscalateAppeals: boolean;

    // Role management
    canManageRoles: boolean;
    canAssignModerators: boolean;

    // Platform administration
    canAccessAdminPanel: boolean;
    canViewPlatformAnalytics: boolean;
    canManageSettings: boolean;
    canManageFeaturedContent: boolean;
  };
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  isActive: boolean;
}

export interface IPlatformRoleDoc extends Document<Types.ObjectId>, IPlatformRole {}
