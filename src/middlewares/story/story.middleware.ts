import { PlatformRoleGuards } from '../rbac/platformRole.middleware';

/**
 * @deprecated Use PlatformRoleGuards.superAdmin instead
 * This is kept for backwards compatibility
 */
export const validateSuperAdmin = PlatformRoleGuards.superAdmin;
