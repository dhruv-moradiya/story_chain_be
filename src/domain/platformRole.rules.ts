import { PLATFORM_ROLES } from '@constants/index';
import {
  PLATFORM_ROLE_HIERARCHY,
  PlatformRole,
  TPlatformPermission,
} from '@features/platformRole/types/platformRole.types';

export class PlatformRoleRules {
  /**
   * Get role hierarchy level
   */
  static getRoleLevel(role: PlatformRole): number {
    return PLATFORM_ROLE_HIERARCHY.indexOf(role);
  }

  /**
   * Check if user has minimum required role
   */
  static hasMinimumRole(userRole: PlatformRole, requiredRole: PlatformRole): boolean {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole);
  }

  /**
   * Check if user has a permission assigned to the role
   */
  static hasPermission(userRole: PlatformRole, permission: TPlatformPermission): boolean {
    const config = PLATFORM_ROLES[userRole];
    if (!config) return false;

    return config.permissions[permission] === true;
  }
}
