import { Document, Types } from 'mongoose';

enum PlatformRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_MODERATOR = 'PLATFORM_MODERATOR',
  APPEAL_MODERATOR = 'APPEAL_MODERATOR',
  USER = 'USER',
}

const PLATFORM_ROLE_HIERARCHY: PlatformRole[] = [
  PlatformRole.USER,
  PlatformRole.APPEAL_MODERATOR,
  PlatformRole.PLATFORM_MODERATOR,
  PlatformRole.SUPER_ADMIN,
];

type TPlatformRole = keyof typeof PlatformRole;

type TPlatformPermission =
  | 'canBanUsers'
  | 'canUnbanUsers'
  | 'canViewAllReports'
  | 'canDeleteAnyContent'
  | 'canReviewAppeals'
  | 'canApproveAppeals'
  | 'canRejectAppeals'
  | 'canEscalateAppeals'
  | 'canManageRoles'
  | 'canAssignModerators'
  | 'canAccessAdminPanel'
  | 'canViewPlatformAnalytics'
  | 'canManageSettings'
  | 'canManageFeaturedContent';

interface IPlatformRole {
  userId: string;
  role: TPlatformRole;
  assignedBy?: string;
  assignedAt: Date;
}

interface IPlatformRoleDoc extends Document<Types.ObjectId>, IPlatformRole {}

export { PlatformRole, PLATFORM_ROLE_HIERARCHY };
export type { IPlatformRoleDoc, IPlatformRole, TPlatformRole, TPlatformPermission };
