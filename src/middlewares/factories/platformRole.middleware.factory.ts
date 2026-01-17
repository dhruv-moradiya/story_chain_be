import { FastifyReply, FastifyRequest } from 'fastify';
import { singleton } from 'tsyringe';
import { HTTP_STATUS } from '@constants/httpStatus';
import { PLATFORM_ROLES } from '@constants/index';
import { PlatformRoleRules } from '@domain/platformRole.rules';
import { PlatformRole, TPlatformPermission } from '@features/platformRole/types/platformRole.types';
import { logger } from '@utils/logger';

@singleton()
export class PlatformRoleMiddlewareFactory {
  /**
   * Creates middleware requiring minimum platform role
   */
  createRequireRole(minimumRole: PlatformRole) {
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

  /**
   * Creates middleware requiring specific platform permission
   */
  createRequirePermission(permission: TPlatformPermission) {
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
          message: 'You do not have permission to perform this action.',
          requiredPermission: permission,
        });
      }
    };
  }

  /**
   * Creates middleware requiring any of the specified permissions
   */
  createRequireAnyPermission(permissions: TPlatformPermission[]) {
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
      const hasAnyPermission = permissions.some((p) =>
        PlatformRoleRules.hasPermission(userRole, p)
      );

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

  /**
   * Creates middleware requiring all specified permissions
   */
  createRequireAllPermissions(permissions: TPlatformPermission[]) {
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

  /**
   * Pre-built guards for common use cases
   */
  createGuards() {
    return {
      // Role guards
      superAdmin: this.createRequireRole(PlatformRole.SUPER_ADMIN),
      moderator: this.createRequireRole(PlatformRole.PLATFORM_MODERATOR),
      appealModerator: this.createRequireRole(PlatformRole.APPEAL_MODERATOR),

      // Permission guards
      canBan: this.createRequirePermission('canBanUsers'),
      canUnban: this.createRequirePermission('canUnbanUsers'),
      canAccessAdmin: this.createRequirePermission('canAccessAdminPanel'),
      canViewReports: this.createRequirePermission('canViewAllReports'),
      canDeleteContent: this.createRequirePermission('canDeleteAnyContent'),
      canManageFeatured: this.createRequirePermission('canManageFeaturedContent'),
      canManageSettings: this.createRequirePermission('canManageSettings'),
      canManageRoles: this.createRequirePermission('canManageRoles'),
    };
  }
}
