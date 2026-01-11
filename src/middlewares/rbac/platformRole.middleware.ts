import { FastifyReply, FastifyRequest } from 'fastify';
import { PlatformRole, TPlatformPermission } from '@features/platformRole/types/platformRole.types';
import { HTTP_STATUS } from '@constants/httpStatus';
import { PlatformRoleRules } from '@domain/platformRole.rules';
import { logger } from '@utils/logger';
import { PLATFORM_ROLES } from '@constants/index';

function requirePlatformRole(minimumRole: PlatformRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRole = user.role as PlatformRole;

    if (!PlatformRoleRules.hasMinimumRole(userRole, minimumRole)) {
      logger.warn('Platform role check failed', {
        userId: user.clerkId,
        userRole,
        requiredRole: minimumRole,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `This action requires ${PLATFORM_ROLES[minimumRole].name || minimumRole} role or higher.`,
        requiredRole: minimumRole,
      });
    }
  };
}

function requirePlatformPermission(permission: TPlatformPermission) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRole = user.role as PlatformRole;

    if (!PlatformRoleRules.hasPermission(userRole, permission)) {
      logger.warn('Platform permission check failed', {
        userId: user.clerkId,
        userRole,
        requiredPermission: permission,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `You do not have permission to perform this action.`,
        requiredPermission: permission,
      });
    }
  };
}

function requireAnyPlatformPermission(permissions: TPlatformPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRole = user.role as PlatformRole;
    const hasAnyPermission = permissions.some((p) => PlatformRoleRules.hasPermission(userRole, p));

    if (!hasAnyPermission) {
      logger.warn('Platform permission check failed (any)', {
        userId: user.clerkId,
        userRole,
        requiredPermissions: permissions,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to perform this action.',
        requiredPermissions: permissions,
      });
    }
  };
}

function requireAllPlatformPermissions(permissions: TPlatformPermission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const userRole = user.role as PlatformRole;
    const missingPermissions = permissions.filter(
      (p) => !PlatformRoleRules.hasPermission(userRole, p)
    );

    if (missingPermissions.length > 0) {
      logger.warn('Platform permission check failed (all)', {
        userId: user.clerkId,
        userRole,
        missingPermissions,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You do not have all required permissions for this action.',
        missingPermissions,
      });
    }
  };
}

const PlatformRoleGuards = {
  /**
   * Require SUPER_ADMIN role
   */
  superAdmin: requirePlatformRole(PlatformRole.SUPER_ADMIN),

  /**
   * Require PLATFORM_MODERATOR or higher
   */
  moderator: requirePlatformRole(PlatformRole.PLATFORM_MODERATOR),

  /**
   * Require APPEAL_MODERATOR or higher
   */
  appealModerator: requirePlatformRole(PlatformRole.APPEAL_MODERATOR),

  /**
   * Can ban users
   */
  canBan: requirePlatformPermission('canBanUsers'),

  /**
   * Can unban users
   */
  canUnban: requirePlatformPermission('canUnbanUsers'),

  /**
   * Can access admin panel
   */
  canAccessAdmin: requirePlatformPermission('canAccessAdminPanel'),

  /**
   * Can view all reports
   */
  canViewReports: requirePlatformPermission('canViewAllReports'),

  /**
   * Can delete any content
   */
  canDeleteContent: requirePlatformPermission('canDeleteAnyContent'),

  /**
   * Can manage featured content
   */
  canManageFeatured: requirePlatformPermission('canManageFeaturedContent'),

  /**
   * Can manage platform settings
   */
  canManageSettings: requirePlatformPermission('canManageSettings'),

  /**
   * Can manage roles
   */
  canManageRoles: requirePlatformPermission('canManageRoles'),
};

export {
  requirePlatformRole,
  requirePlatformPermission,
  requireAnyPlatformPermission,
  requireAllPlatformPermissions,
  PlatformRoleGuards,
};
