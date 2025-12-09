# Role-Based Access Control (RBAC) Middleware Implementation Guide

**Version:** 1.0.0
**Last Updated:** December 2024
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Directory Structure](#directory-structure)
4. [Platform Role Middleware](#platform-role-middleware)
5. [Story Role Middleware](#story-role-middleware)
6. [Permission Checking Utilities](#permission-checking-utilities)
7. [Route Integration](#route-integration)
8. [Domain Rules Update](#domain-rules-update)
9. [Database Models](#database-models)
10. [Testing](#testing)
11. [Best Practices](#best-practices)

---

## Overview

### Current State

The StoryChain backend has two levels of roles defined:

1. **Platform Roles** - Global permissions across the entire application
2. **Story Roles** - Permissions within a specific story

**Problem:** These roles are **defined** in `src/constants/index.ts` but **not enforced** in the middleware or domain rules.

### Goal

Implement comprehensive RBAC middleware that:

- Enforces platform-level permissions
- Enforces story-level permissions
- Is composable and reusable
- Provides clear error messages
- Integrates with existing auth flow

---

## Role Hierarchy

### Platform Roles

```
SUPER_ADMIN
    │
    ├── PLATFORM_MODERATOR
    │
    ├── APPEAL_MODERATOR
    │
    └── USER (default)
```

| Role                 | Description           | Key Permissions                           |
| -------------------- | --------------------- | ----------------------------------------- |
| `SUPER_ADMIN`        | Full platform control | All permissions                           |
| `PLATFORM_MODERATOR` | Content moderation    | Ban users, delete content, review reports |
| `APPEAL_MODERATOR`   | Handle ban appeals    | Review appeals, unban users               |
| `USER`               | Standard user         | Create content, interact                  |

### Story Roles

```
OWNER
    │
    ├── CO_AUTHOR
    │
    ├── MODERATOR
    │
    ├── REVIEWER
    │
    └── CONTRIBUTOR
```

| Role          | Description    | Key Permissions                               |
| ------------- | -------------- | --------------------------------------------- |
| `OWNER`       | Story creator  | Full control, can delete story                |
| `CO_AUTHOR`   | Equal partner  | All except delete story, remove collaborators |
| `MODERATOR`   | Manage content | Approve PRs, moderate comments                |
| `REVIEWER`    | Review only    | Can comment on PRs                            |
| `CONTRIBUTOR` | Write chapters | Direct write access, no moderation            |

---

## Directory Structure

```
src/
├── middlewares/
│   └── rbac/
│       ├── index.ts                    # Main exports
│       ├── platformRole.middleware.ts  # Platform role checks
│       ├── storyRole.middleware.ts     # Story role checks
│       ├── permissions.ts              # Permission utilities
│       └── types.ts                    # TypeScript types
├── constants/
│   └── permissions.ts                  # Permission constants (new)
└── domain/
    └── story.rules.ts                  # Updated with role checks
```

---

## Platform Role Middleware

### Types Definition

Create `src/middlewares/rbac/types.ts`:

```typescript
/**
 * RBAC Type Definitions
 */

// Platform Role Types
export enum PlatformRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_MODERATOR = 'PLATFORM_MODERATOR',
  APPEAL_MODERATOR = 'APPEAL_MODERATOR',
  USER = 'USER',
}

// Story Role Types
export enum StoryRole {
  OWNER = 'OWNER',
  CO_AUTHOR = 'CO_AUTHOR',
  MODERATOR = 'MODERATOR',
  REVIEWER = 'REVIEWER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

// Platform Permission Keys
export type PlatformPermission =
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

// Story Permission Keys
export type StoryPermission =
  | 'canEditStorySettings'
  | 'canDeleteStory'
  | 'canArchiveStory'
  | 'canWriteChapters'
  | 'canEditAnyChapter'
  | 'canDeleteAnyChapter'
  | 'canApprovePRs'
  | 'canRejectPRs'
  | 'canReviewPRs'
  | 'canMergePRs'
  | 'canInviteCollaborators'
  | 'canRemoveCollaborators'
  | 'canChangePermissions'
  | 'canModerateComments'
  | 'canDeleteComments'
  | 'canBanFromStory'
  | 'canViewStoryAnalytics';

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: PlatformRole | StoryRole;
  requiredPermission?: PlatformPermission | StoryPermission;
}

// Story context for role checking
export interface StoryContext {
  storyId: string;
  creatorId: string;
  status: string;
  collaborators?: Array<{
    userId: string;
    role: StoryRole;
  }>;
}
```

### Platform Role Middleware

Create `src/middlewares/rbac/platformRole.middleware.ts`:

```typescript
/**
 * Platform Role Middleware
 *
 * Middleware functions for checking platform-level roles and permissions.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { PLATFORM_ROLES } from '../../constants';
import { logger } from '../../utils/logger';
import { PlatformRole, PlatformPermission } from './types';

/**
 * Platform role hierarchy (higher index = more permissions)
 */
const PLATFORM_ROLE_HIERARCHY: PlatformRole[] = [
  PlatformRole.USER,
  PlatformRole.APPEAL_MODERATOR,
  PlatformRole.PLATFORM_MODERATOR,
  PlatformRole.SUPER_ADMIN,
];

/**
 * Get role hierarchy level
 */
function getRoleLevel(role: PlatformRole): number {
  return PLATFORM_ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if user has minimum required role
 */
export function hasMinimumRole(userRole: PlatformRole, requiredRole: PlatformRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Check if user has specific platform permission
 */
export function hasPlatformPermission(
  userRole: PlatformRole,
  permission: PlatformPermission
): boolean {
  const roleConfig = PLATFORM_ROLES[userRole];
  if (!roleConfig) return false;
  return roleConfig.permissions[permission] === true;
}

/**
 * Middleware: Require minimum platform role
 *
 * @param minimumRole - Minimum role required to access the route
 *
 * @example
 * // Require at least PLATFORM_MODERATOR
 * fastify.get('/admin/reports', {
 *   preHandler: [validateAuth, requirePlatformRole(PlatformRole.PLATFORM_MODERATOR)]
 * }, handler);
 */
export function requirePlatformRole(minimumRole: PlatformRole) {
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

    if (!hasMinimumRole(userRole, minimumRole)) {
      logger.warn('Platform role check failed', {
        userId: user.clerkId || user._id,
        userRole,
        requiredRole: minimumRole,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `This action requires ${PLATFORM_ROLES[minimumRole]?.name || minimumRole} role or higher.`,
        requiredRole: minimumRole,
      });
    }
  };
}

/**
 * Middleware: Require specific platform permission
 *
 * @param permission - Specific permission required
 *
 * @example
 * // Require canBanUsers permission
 * fastify.post('/admin/users/:id/ban', {
 *   preHandler: [validateAuth, requirePlatformPermission('canBanUsers')]
 * }, handler);
 */
export function requirePlatformPermission(permission: PlatformPermission) {
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

    if (!hasPlatformPermission(userRole, permission)) {
      logger.warn('Platform permission check failed', {
        userId: user.clerkId || user._id,
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

/**
 * Middleware: Require any of the specified permissions
 *
 * @param permissions - Array of permissions (user needs at least one)
 *
 * @example
 * // Require either canBanUsers OR canDeleteAnyContent
 * fastify.delete('/content/:id', {
 *   preHandler: [validateAuth, requireAnyPlatformPermission(['canBanUsers', 'canDeleteAnyContent'])]
 * }, handler);
 */
export function requireAnyPlatformPermission(permissions: PlatformPermission[]) {
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
    const hasAnyPermission = permissions.some((p) => hasPlatformPermission(userRole, p));

    if (!hasAnyPermission) {
      logger.warn('Platform permission check failed (any)', {
        userId: user.clerkId || user._id,
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
 * Middleware: Require all of the specified permissions
 *
 * @param permissions - Array of permissions (user needs all)
 */
export function requireAllPlatformPermissions(permissions: PlatformPermission[]) {
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
    const missingPermissions = permissions.filter((p) => !hasPlatformPermission(userRole, p));

    if (missingPermissions.length > 0) {
      logger.warn('Platform permission check failed (all)', {
        userId: user.clerkId || user._id,
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
 * Pre-built middleware for common platform role checks
 */
export const PlatformRoleGuards = {
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
```

---

## Story Role Middleware

Create `src/middlewares/rbac/storyRole.middleware.ts`:

```typescript
/**
 * Story Role Middleware
 *
 * Middleware functions for checking story-level roles and permissions.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { STORY_ROLES } from '../../constants';
import { logger } from '../../utils/logger';
import { StoryRole, StoryPermission, StoryContext, PlatformRole } from './types';
import { Story } from '../../models/story.model';
import { StoryCollaborator } from '../../models/storyCollaborator.model';
import { hasPlatformPermission } from './platformRole.middleware';

/**
 * Story role hierarchy (higher index = more permissions)
 */
const STORY_ROLE_HIERARCHY: StoryRole[] = [
  StoryRole.CONTRIBUTOR,
  StoryRole.REVIEWER,
  StoryRole.MODERATOR,
  StoryRole.CO_AUTHOR,
  StoryRole.OWNER,
];

/**
 * Get role hierarchy level
 */
function getStoryRoleLevel(role: StoryRole): number {
  return STORY_ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if user has minimum required story role
 */
export function hasMinimumStoryRole(userRole: StoryRole, requiredRole: StoryRole): boolean {
  return getStoryRoleLevel(userRole) >= getStoryRoleLevel(requiredRole);
}

/**
 * Check if user has specific story permission
 */
export function hasStoryPermission(role: StoryRole, permission: StoryPermission): boolean {
  const roleConfig = STORY_ROLES[role];
  if (!roleConfig) return false;
  return roleConfig.permissions[permission] === true;
}

/**
 * Get user's role in a story
 */
export async function getUserStoryRole(userId: string, storyId: string): Promise<StoryRole | null> {
  // Check if user is the story creator (OWNER)
  const story = await Story.findById(storyId).lean();
  if (!story) return null;

  if (story.creatorId === userId) {
    return StoryRole.OWNER;
  }

  // Check collaborator role
  const collaborator = await StoryCollaborator.findOne({
    storyId,
    userId,
    status: 'ACTIVE',
  }).lean();

  if (collaborator) {
    return collaborator.role as StoryRole;
  }

  return null;
}

/**
 * Extend FastifyRequest to include story context
 */
declare module 'fastify' {
  interface FastifyRequest {
    storyContext?: StoryContext;
    userStoryRole?: StoryRole | null;
  }
}

/**
 * Middleware: Load story context and user's role
 *
 * This should be used before any story role check middleware.
 * It loads the story and determines the user's role in that story.
 *
 * @example
 * fastify.post('/stories/:storyId/chapters', {
 *   preHandler: [validateAuth, loadStoryContext, requireStoryPermission('canWriteChapters')]
 * }, handler);
 */
export async function loadStoryContext(
  request: FastifyRequest<{ Params: { storyId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { storyId } = request.params;

  if (!storyId) {
    return reply.code(HTTP_STATUS.BAD_REQUEST.code).send({
      success: false,
      error: 'Bad Request',
      message: 'Story ID is required.',
    });
  }

  const story = await Story.findById(storyId).lean();

  if (!story) {
    return reply.code(HTTP_STATUS.NOT_FOUND.code).send({
      success: false,
      error: 'Not Found',
      message: 'Story not found.',
    });
  }

  // Build story context
  request.storyContext = {
    storyId: story._id.toString(),
    creatorId: story.creatorId,
    status: story.status,
  };

  // Get user's role in this story
  if (request.user) {
    const userId = request.user.clerkId || request.user._id?.toString();
    request.userStoryRole = await getUserStoryRole(userId, storyId);
  } else {
    request.userStoryRole = null;
  }
}

/**
 * Middleware: Require minimum story role
 *
 * @param minimumRole - Minimum role required
 * @param allowPlatformOverride - Allow platform moderators to bypass
 *
 * @example
 * // Require at least MODERATOR role
 * fastify.post('/stories/:storyId/pr/:prId/approve', {
 *   preHandler: [validateAuth, loadStoryContext, requireStoryRole(StoryRole.MODERATOR)]
 * }, handler);
 */
export function requireStoryRole(
  minimumRole: StoryRole,
  options: { allowPlatformOverride?: boolean } = {}
) {
  const { allowPlatformOverride = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    const userStoryRole = request.userStoryRole;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    // Check platform override (platform moderators can access any story)
    if (allowPlatformOverride) {
      const platformRole = user.role as PlatformRole;
      if (
        hasPlatformPermission(platformRole, 'canDeleteAnyContent') ||
        platformRole === PlatformRole.SUPER_ADMIN
      ) {
        return; // Allow access
      }
    }

    // Check story role
    if (!userStoryRole) {
      logger.warn('Story role check failed - no role', {
        userId: user.clerkId || user._id,
        storyId: request.storyContext?.storyId,
        requiredRole: minimumRole,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You are not a collaborator on this story.',
      });
    }

    if (!hasMinimumStoryRole(userStoryRole, minimumRole)) {
      logger.warn('Story role check failed', {
        userId: user.clerkId || user._id,
        storyId: request.storyContext?.storyId,
        userRole: userStoryRole,
        requiredRole: minimumRole,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `This action requires ${STORY_ROLES[minimumRole]?.name || minimumRole} role or higher.`,
        requiredRole: minimumRole,
        yourRole: userStoryRole,
      });
    }
  };
}

/**
 * Middleware: Require specific story permission
 *
 * @param permission - Specific permission required
 * @param allowPlatformOverride - Allow platform moderators to bypass
 *
 * @example
 * // Require canApprovePRs permission
 * fastify.post('/stories/:storyId/pr/:prId/approve', {
 *   preHandler: [validateAuth, loadStoryContext, requireStoryPermission('canApprovePRs')]
 * }, handler);
 */
export function requireStoryPermission(
  permission: StoryPermission,
  options: { allowPlatformOverride?: boolean } = {}
) {
  const { allowPlatformOverride = true } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    const userStoryRole = request.userStoryRole;

    if (!user) {
      return reply.code(HTTP_STATUS.UNAUTHORIZED.code).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    // Check platform override
    if (allowPlatformOverride) {
      const platformRole = user.role as PlatformRole;
      if (
        hasPlatformPermission(platformRole, 'canDeleteAnyContent') ||
        platformRole === PlatformRole.SUPER_ADMIN
      ) {
        return; // Allow access
      }
    }

    // No role in story
    if (!userStoryRole) {
      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: 'You are not a collaborator on this story.',
        requiredPermission: permission,
      });
    }

    // Check permission
    if (!hasStoryPermission(userStoryRole, permission)) {
      logger.warn('Story permission check failed', {
        userId: user.clerkId || user._id,
        storyId: request.storyContext?.storyId,
        userRole: userStoryRole,
        requiredPermission: permission,
        endpoint: request.url,
      });

      return reply.code(HTTP_STATUS.FORBIDDEN.code).send({
        success: false,
        error: 'Access denied',
        message: `Your role (${STORY_ROLES[userStoryRole]?.name || userStoryRole}) does not have permission to perform this action.`,
        requiredPermission: permission,
        yourRole: userStoryRole,
      });
    }
  };
}

/**
 * Middleware: Require story ownership
 *
 * Only the story OWNER can perform this action
 */
export function requireStoryOwnership(options: { allowPlatformOverride?: boolean } = {}) {
  return requireStoryRole(StoryRole.OWNER, options);
}

/**
 * Middleware: Allow any authenticated user OR story collaborator
 *
 * Useful for actions that anyone can do, but collaborators might have extra permissions
 */
export async function loadOptionalStoryContext(
  request: FastifyRequest<{ Params: { storyId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { storyId } = request.params;

  if (!storyId) {
    request.storyContext = undefined;
    request.userStoryRole = null;
    return;
  }

  try {
    const story = await Story.findById(storyId).lean();

    if (story) {
      request.storyContext = {
        storyId: story._id.toString(),
        creatorId: story.creatorId,
        status: story.status,
      };

      if (request.user) {
        const userId = request.user.clerkId || request.user._id?.toString();
        request.userStoryRole = await getUserStoryRole(userId, storyId);
      }
    }
  } catch {
    // Silently fail - story context is optional
  }
}

/**
 * Pre-built middleware for common story role checks
 */
export const StoryRoleGuards = {
  /**
   * Load story context (required before other guards)
   */
  loadContext: loadStoryContext,

  /**
   * Load optional story context
   */
  loadOptionalContext: loadOptionalStoryContext,

  /**
   * Require OWNER role
   */
  owner: requireStoryRole(StoryRole.OWNER),

  /**
   * Require CO_AUTHOR or higher
   */
  coAuthor: requireStoryRole(StoryRole.CO_AUTHOR),

  /**
   * Require MODERATOR or higher
   */
  moderator: requireStoryRole(StoryRole.MODERATOR),

  /**
   * Require REVIEWER or higher
   */
  reviewer: requireStoryRole(StoryRole.REVIEWER),

  /**
   * Require CONTRIBUTOR or higher (any collaborator)
   */
  contributor: requireStoryRole(StoryRole.CONTRIBUTOR),

  /**
   * Can write chapters
   */
  canWriteChapters: requireStoryPermission('canWriteChapters'),

  /**
   * Can approve PRs
   */
  canApprovePRs: requireStoryPermission('canApprovePRs'),

  /**
   * Can reject PRs
   */
  canRejectPRs: requireStoryPermission('canRejectPRs'),

  /**
   * Can merge PRs
   */
  canMergePRs: requireStoryPermission('canMergePRs'),

  /**
   * Can review PRs (comment)
   */
  canReviewPRs: requireStoryPermission('canReviewPRs'),

  /**
   * Can moderate comments
   */
  canModerateComments: requireStoryPermission('canModerateComments'),

  /**
   * Can delete comments
   */
  canDeleteComments: requireStoryPermission('canDeleteComments'),

  /**
   * Can edit story settings
   */
  canEditSettings: requireStoryPermission('canEditStorySettings'),

  /**
   * Can delete story
   */
  canDeleteStory: requireStoryPermission('canDeleteStory'),

  /**
   * Can invite collaborators
   */
  canInvite: requireStoryPermission('canInviteCollaborators'),

  /**
   * Can remove collaborators
   */
  canRemoveCollaborators: requireStoryPermission('canRemoveCollaborators'),

  /**
   * Can ban users from story
   */
  canBanFromStory: requireStoryPermission('canBanFromStory'),
};
```

---

## Permission Checking Utilities

Create `src/middlewares/rbac/permissions.ts`:

```typescript
/**
 * Permission Checking Utilities
 *
 * Helper functions for checking permissions in controllers and services.
 */

import { PLATFORM_ROLES, STORY_ROLES } from '../../constants';
import {
  PlatformRole,
  PlatformPermission,
  StoryRole,
  StoryPermission,
  PermissionCheckResult,
} from './types';

/**
 * Check if user can perform platform action
 */
export function checkPlatformPermission(
  userRole: PlatformRole | string,
  permission: PlatformPermission
): PermissionCheckResult {
  const roleConfig = PLATFORM_ROLES[userRole as PlatformRole];

  if (!roleConfig) {
    return {
      allowed: false,
      reason: `Unknown role: ${userRole}`,
    };
  }

  const allowed = roleConfig.permissions[permission] === true;

  return {
    allowed,
    reason: allowed ? undefined : `Role ${roleConfig.name} does not have ${permission} permission`,
    requiredPermission: allowed ? undefined : permission,
  };
}

/**
 * Check if user can perform story action
 */
export function checkStoryPermission(
  userRole: StoryRole | string | null,
  permission: StoryPermission
): PermissionCheckResult {
  if (!userRole) {
    return {
      allowed: false,
      reason: 'User is not a collaborator on this story',
    };
  }

  const roleConfig = STORY_ROLES[userRole as StoryRole];

  if (!roleConfig) {
    return {
      allowed: false,
      reason: `Unknown story role: ${userRole}`,
    };
  }

  const allowed = roleConfig.permissions[permission] === true;

  return {
    allowed,
    reason: allowed ? undefined : `Role ${roleConfig.name} does not have ${permission} permission`,
    requiredPermission: allowed ? undefined : permission,
  };
}

/**
 * Check multiple permissions (all required)
 */
export function checkAllPermissions(
  userRole: StoryRole | string | null,
  permissions: StoryPermission[]
): PermissionCheckResult {
  for (const permission of permissions) {
    const result = checkStoryPermission(userRole, permission);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Check multiple permissions (any required)
 */
export function checkAnyPermission(
  userRole: StoryRole | string | null,
  permissions: StoryPermission[]
): PermissionCheckResult {
  for (const permission of permissions) {
    const result = checkStoryPermission(userRole, permission);
    if (result.allowed) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `None of the required permissions found: ${permissions.join(', ')}`,
  };
}

/**
 * Get all permissions for a role
 */
export function getStoryRolePermissions(role: StoryRole): StoryPermission[] {
  const roleConfig = STORY_ROLES[role];
  if (!roleConfig) return [];

  return Object.entries(roleConfig.permissions)
    .filter(([, value]) => value === true)
    .map(([key]) => key as StoryPermission);
}

/**
 * Get all permissions for a platform role
 */
export function getPlatformRolePermissions(role: PlatformRole): PlatformPermission[] {
  const roleConfig = PLATFORM_ROLES[role];
  if (!roleConfig) return [];

  return Object.entries(roleConfig.permissions)
    .filter(([, value]) => value === true)
    .map(([key]) => key as PlatformPermission);
}

/**
 * Check if user is story owner
 */
export function isStoryOwner(userId: string, storyCreatorId: string): boolean {
  return userId === storyCreatorId;
}

/**
 * Can user edit this specific content?
 *
 * Checks ownership or edit permission
 */
export function canEditContent(
  userId: string,
  contentOwnerId: string,
  userStoryRole: StoryRole | null
): PermissionCheckResult {
  // Owner of content can always edit
  if (userId === contentOwnerId) {
    return { allowed: true };
  }

  // Check story role permission
  return checkStoryPermission(userStoryRole, 'canEditAnyChapter');
}

/**
 * Can user delete this specific content?
 */
export function canDeleteContent(
  userId: string,
  contentOwnerId: string,
  userStoryRole: StoryRole | null
): PermissionCheckResult {
  // Owner of content can always delete
  if (userId === contentOwnerId) {
    return { allowed: true };
  }

  // Check story role permission
  return checkStoryPermission(userStoryRole, 'canDeleteAnyChapter');
}
```

---

## Main Export

Create `src/middlewares/rbac/index.ts`:

```typescript
/**
 * RBAC Module
 *
 * Role-Based Access Control for StoryChain
 */

// Types
export * from './types';

// Platform Role Middleware
export {
  requirePlatformRole,
  requirePlatformPermission,
  requireAnyPlatformPermission,
  requireAllPlatformPermissions,
  hasMinimumRole,
  hasPlatformPermission,
  PlatformRoleGuards,
} from './platformRole.middleware';

// Story Role Middleware
export {
  loadStoryContext,
  loadOptionalStoryContext,
  requireStoryRole,
  requireStoryPermission,
  requireStoryOwnership,
  getUserStoryRole,
  hasMinimumStoryRole,
  hasStoryPermission,
  StoryRoleGuards,
} from './storyRole.middleware';

// Permission Utilities
export {
  checkPlatformPermission,
  checkStoryPermission,
  checkAllPermissions,
  checkAnyPermission,
  getStoryRolePermissions,
  getPlatformRolePermissions,
  isStoryOwner,
  canEditContent,
  canDeleteContent,
} from './permissions';
```

---

## Route Integration

### Example: Story Routes with RBAC

Update `src/features/story/story.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { PlatformRoleGuards, StoryRoleGuards, loadStoryContext } from '../../middlewares/rbac';
import { RateLimiters } from '../../middlewares/rateLimit';
import { StoryAddChapterSchema, StoryCreateSchema, StoryIdSchema } from '../../schema/story.schema';
import { storyController } from './story.controller';
import zodToJsonSchema from 'zod-to-json-schema';

export async function storyRoutes(fastify: FastifyInstance) {
  // ===============================
  // PUBLIC ROUTES
  // ===============================

  // Public feed - stories from last 7 days
  fastify.get(
    '/new',
    {
      ...RateLimiters.storyGet,
    },
    storyController.getNewStories
  );

  // Get single story (with visibility check in controller)
  fastify.get(
    '/:storyId',
    {
      ...RateLimiters.storyGet,
    },
    storyController.getStoryById
  );

  // ===============================
  // AUTHENTICATED ROUTES
  // ===============================

  // Create a new story
  fastify.post(
    '/',
    {
      preHandler: [validateAuth],
      schema: { body: zodToJsonSchema(StoryCreateSchema) },
      ...RateLimiters.storyCreate,
    },
    storyController.createStory
  );

  // Get my stories
  fastify.get(
    '/my',
    {
      preHandler: [validateAuth],
      ...RateLimiters.storyList,
    },
    storyController.getMyStories
  );

  // ===============================
  // STORY COLLABORATOR ROUTES
  // ===============================

  // Add chapter - requires write permission
  fastify.post(
    '/:storyId/chapters',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canWriteChapters],
      schema: {
        body: zodToJsonSchema(StoryAddChapterSchema),
        params: zodToJsonSchema(StoryIdSchema),
      },
      ...RateLimiters.chapterCreate,
    },
    storyController.addChapterToStory
  );

  // Update story settings - requires edit permission
  fastify.patch(
    '/:storyId',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditSettings],
      ...RateLimiters.storyUpdate,
    },
    storyController.updateStory
  );

  // Delete story - requires delete permission (OWNER only)
  fastify.delete(
    '/:storyId',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canDeleteStory],
    },
    storyController.deleteStory
  );

  // ===============================
  // PR ROUTES
  // ===============================

  // Submit PR - any authenticated user can submit
  fastify.post(
    '/:storyId/pr',
    {
      preHandler: [validateAuth, loadStoryContext],
      ...RateLimiters.prCreate,
    },
    storyController.submitPR
  );

  // Approve PR - requires approve permission
  fastify.post(
    '/:storyId/pr/:prId/approve',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canApprovePRs],
      ...RateLimiters.prReview,
    },
    storyController.approvePR
  );

  // Reject PR - requires reject permission
  fastify.post(
    '/:storyId/pr/:prId/reject',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canRejectPRs],
      ...RateLimiters.prReview,
    },
    storyController.rejectPR
  );

  // ===============================
  // COLLABORATOR MANAGEMENT
  // ===============================

  // Invite collaborator
  fastify.post(
    '/:storyId/collaborators',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canInvite],
    },
    storyController.inviteCollaborator
  );

  // Remove collaborator
  fastify.delete(
    '/:storyId/collaborators/:userId',
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canRemoveCollaborators],
    },
    storyController.removeCollaborator
  );

  // ===============================
  // ADMIN ROUTES
  // ===============================

  // List all stories - SUPER_ADMIN only
  fastify.get(
    '/',
    {
      preHandler: [validateAuth, PlatformRoleGuards.superAdmin],
      ...RateLimiters.storyList,
    },
    storyController.getStories
  );

  // Delete any story - platform moderator
  fastify.delete(
    '/admin/:storyId',
    {
      preHandler: [validateAuth, PlatformRoleGuards.canDeleteContent],
    },
    storyController.adminDeleteStory
  );
}
```

### Example: Admin Routes

Create `src/features/admin/admin.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { validateAuth } from '../../middlewares/authHandler';
import { PlatformRoleGuards } from '../../middlewares/rbac';
import { adminController } from './admin.controller';

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication
  fastify.addHook('preHandler', validateAuth);

  // ===============================
  // SUPER ADMIN ONLY
  // ===============================

  // Platform settings
  fastify.get(
    '/settings',
    {
      preHandler: [PlatformRoleGuards.canManageSettings],
    },
    adminController.getSettings
  );

  fastify.patch(
    '/settings',
    {
      preHandler: [PlatformRoleGuards.canManageSettings],
    },
    adminController.updateSettings
  );

  // Role management
  fastify.get(
    '/roles',
    {
      preHandler: [PlatformRoleGuards.canManageRoles],
    },
    adminController.listRoles
  );

  fastify.post(
    '/users/:userId/role',
    {
      preHandler: [PlatformRoleGuards.canManageRoles],
    },
    adminController.assignRole
  );

  // ===============================
  // MODERATOR ROUTES
  // ===============================

  // Reports
  fastify.get(
    '/reports',
    {
      preHandler: [PlatformRoleGuards.canViewReports],
    },
    adminController.listReports
  );

  fastify.post(
    '/reports/:reportId/resolve',
    {
      preHandler: [PlatformRoleGuards.canViewReports],
    },
    adminController.resolveReport
  );

  // User management
  fastify.post(
    '/users/:userId/ban',
    {
      preHandler: [PlatformRoleGuards.canBan],
    },
    adminController.banUser
  );

  fastify.post(
    '/users/:userId/unban',
    {
      preHandler: [PlatformRoleGuards.canUnban],
    },
    adminController.unbanUser
  );

  // Content moderation
  fastify.delete(
    '/content/:contentId',
    {
      preHandler: [PlatformRoleGuards.canDeleteContent],
    },
    adminController.deleteContent
  );

  // ===============================
  // APPEAL MODERATOR ROUTES
  // ===============================

  fastify.get(
    '/appeals',
    {
      preHandler: [PlatformRoleGuards.appealModerator],
    },
    adminController.listAppeals
  );

  fastify.post(
    '/appeals/:appealId/approve',
    {
      preHandler: [PlatformRoleGuards.appealModerator],
    },
    adminController.approveAppeal
  );

  fastify.post(
    '/appeals/:appealId/reject',
    {
      preHandler: [PlatformRoleGuards.appealModerator],
    },
    adminController.rejectAppeal
  );

  // ===============================
  // ANALYTICS (Various access levels)
  // ===============================

  fastify.get(
    '/analytics/platform',
    {
      preHandler: [PlatformRoleGuards.superAdmin],
    },
    adminController.getPlatformAnalytics
  );

  fastify.get(
    '/analytics/content',
    {
      preHandler: [PlatformRoleGuards.moderator],
    },
    adminController.getContentAnalytics
  );
}
```

---

## Domain Rules Update

Update `src/domain/story.rules.ts`:

```typescript
import { STORY_ROLES } from '../constants';
import { IStory, StoryStatus, TStoryStatus } from '../features/story/story.types';
import { StoryRole } from '../middlewares/rbac/types';
import { hasStoryPermission, hasMinimumStoryRole } from '../middlewares/rbac';

export class StoryRules {
  static readonly NEW_STORY_COOLDOWN_IN_DAYS = 7;

  /**
   * Check if user can create a new story (based on daily limit)
   */
  static canCreateStory(todayCount: number): boolean {
    return todayCount < this.NEW_STORY_COOLDOWN_IN_DAYS;
  }

  /**
   * Check if user can edit story settings
   */
  static canEditStory(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    // Owner can always edit
    if (story.creatorId === userId) return true;

    // Check role permission
    if (userRole) {
      return hasStoryPermission(userRole, 'canEditStorySettings');
    }

    return false;
  }

  /**
   * Check if user can delete the story
   */
  static canDeleteStory(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    // Only owner can delete
    if (story.creatorId === userId) return true;

    // Even CO_AUTHOR cannot delete
    return false;
  }

  /**
   * Check if status transition is valid
   */
  static isValidStatusTransition(current: TStoryStatus, next: TStoryStatus): boolean {
    const allowedTransitions: Record<TStoryStatus, TStoryStatus[]> = {
      [StoryStatus.DRAFT]: [StoryStatus.PUBLISHED, StoryStatus.ARCHIVED, StoryStatus.DELETED],
      [StoryStatus.PUBLISHED]: [StoryStatus.ARCHIVED, StoryStatus.DELETED],
      [StoryStatus.ARCHIVED]: [StoryStatus.DELETED],
      [StoryStatus.DELETED]: [],
    };

    return allowedTransitions[current].includes(next);
  }

  /**
   * Check if user can add root chapter (first chapter)
   */
  static canAddRootChapter(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    // Owner can always add root
    if (story.creatorId === userId) return true;

    // CO_AUTHOR can add root chapters
    if (userRole && hasMinimumStoryRole(userRole, StoryRole.CO_AUTHOR)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can add any chapter (branch or continuation)
   */
  static canAddChapter(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    // Owner can always add
    if (story.creatorId === userId) return true;

    // Check write permission
    if (userRole) {
      return hasStoryPermission(userRole, 'canWriteChapters');
    }

    return false;
  }

  /**
   * Check if user can add chapter directly (without PR)
   */
  static canAddChapterDirectly(
    story: IStory,
    userId: string,
    userRole?: StoryRole | null
  ): boolean {
    // Owner and CO_AUTHOR can add directly
    if (story.creatorId === userId) return true;

    if (userRole) {
      // CONTRIBUTOR and above can add directly
      return hasMinimumStoryRole(userRole, StoryRole.CONTRIBUTOR);
    }

    return false;
  }

  /**
   * Check if user must use PR system
   */
  static mustUsePRForChapterAddition(
    story: IStory,
    userId: string,
    userRole?: StoryRole | null
  ): boolean {
    return !this.canAddChapterDirectly(story, userId, userRole);
  }

  /**
   * Check if user can publish the story
   */
  static canPublishStory(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.status !== StoryStatus.DRAFT) return false;

    // Owner can publish
    if (story.creatorId === userId) return true;

    // CO_AUTHOR can publish
    if (userRole && hasMinimumStoryRole(userRole, StoryRole.CO_AUTHOR)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can archive the story
   */
  static canArchiveStory(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    // Owner can archive
    if (story.creatorId === userId) return true;

    // Check permission
    if (userRole) {
      return hasStoryPermission(userRole, 'canArchiveStory');
    }

    return false;
  }

  /**
   * Check if user can approve PRs
   */
  static canApprovePR(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canApprovePRs');
    }

    return false;
  }

  /**
   * Check if user can reject PRs
   */
  static canRejectPR(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canRejectPRs');
    }

    return false;
  }

  /**
   * Check if user can moderate comments
   */
  static canModerateComments(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canModerateComments');
    }

    return false;
  }

  /**
   * Check if user can invite collaborators
   */
  static canInviteCollaborators(
    story: IStory,
    userId: string,
    userRole?: StoryRole | null
  ): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canInviteCollaborators');
    }

    return false;
  }

  /**
   * Check if user can remove collaborators
   */
  static canRemoveCollaborators(
    story: IStory,
    userId: string,
    userRole?: StoryRole | null
  ): boolean {
    // Only owner can remove
    return story.creatorId === userId;
  }

  /**
   * Check if user can change collaborator roles
   */
  static canChangeCollaboratorRoles(
    story: IStory,
    userId: string,
    userRole?: StoryRole | null
  ): boolean {
    // Only owner can change roles
    return story.creatorId === userId;
  }

  /**
   * Check if user can ban someone from the story
   */
  static canBanFromStory(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canBanFromStory');
    }

    return false;
  }

  /**
   * Check if user can view story analytics
   */
  static canViewAnalytics(story: IStory, userId: string, userRole?: StoryRole | null): boolean {
    if (story.creatorId === userId) return true;

    if (userRole) {
      return hasStoryPermission(userRole, 'canViewStoryAnalytics');
    }

    return false;
  }
}
```

---

## Testing

### Unit Tests for RBAC

Create `src/middlewares/rbac/__tests__/platformRole.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { hasMinimumRole, hasPlatformPermission } from '../platformRole.middleware';
import { PlatformRole } from '../types';

describe('Platform Role Middleware', () => {
  describe('hasMinimumRole', () => {
    it('should allow SUPER_ADMIN for any role', () => {
      expect(hasMinimumRole(PlatformRole.SUPER_ADMIN, PlatformRole.USER)).toBe(true);
      expect(hasMinimumRole(PlatformRole.SUPER_ADMIN, PlatformRole.PLATFORM_MODERATOR)).toBe(true);
      expect(hasMinimumRole(PlatformRole.SUPER_ADMIN, PlatformRole.SUPER_ADMIN)).toBe(true);
    });

    it('should deny USER for higher roles', () => {
      expect(hasMinimumRole(PlatformRole.USER, PlatformRole.PLATFORM_MODERATOR)).toBe(false);
      expect(hasMinimumRole(PlatformRole.USER, PlatformRole.SUPER_ADMIN)).toBe(false);
    });

    it('should allow same role', () => {
      expect(hasMinimumRole(PlatformRole.USER, PlatformRole.USER)).toBe(true);
      expect(hasMinimumRole(PlatformRole.PLATFORM_MODERATOR, PlatformRole.PLATFORM_MODERATOR)).toBe(
        true
      );
    });
  });

  describe('hasPlatformPermission', () => {
    it('should allow SUPER_ADMIN all permissions', () => {
      expect(hasPlatformPermission(PlatformRole.SUPER_ADMIN, 'canBanUsers')).toBe(true);
      expect(hasPlatformPermission(PlatformRole.SUPER_ADMIN, 'canManageSettings')).toBe(true);
    });

    it('should deny USER admin permissions', () => {
      expect(hasPlatformPermission(PlatformRole.USER, 'canBanUsers')).toBe(false);
      expect(hasPlatformPermission(PlatformRole.USER, 'canAccessAdminPanel')).toBe(false);
    });

    it('should allow PLATFORM_MODERATOR specific permissions', () => {
      expect(hasPlatformPermission(PlatformRole.PLATFORM_MODERATOR, 'canBanUsers')).toBe(true);
      expect(hasPlatformPermission(PlatformRole.PLATFORM_MODERATOR, 'canDeleteAnyContent')).toBe(
        true
      );
      expect(hasPlatformPermission(PlatformRole.PLATFORM_MODERATOR, 'canManageSettings')).toBe(
        false
      );
    });
  });
});
```

Create `src/middlewares/rbac/__tests__/storyRole.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { hasMinimumStoryRole, hasStoryPermission } from '../storyRole.middleware';
import { StoryRole } from '../types';

describe('Story Role Middleware', () => {
  describe('hasMinimumStoryRole', () => {
    it('should allow OWNER for any role', () => {
      expect(hasMinimumStoryRole(StoryRole.OWNER, StoryRole.CONTRIBUTOR)).toBe(true);
      expect(hasMinimumStoryRole(StoryRole.OWNER, StoryRole.MODERATOR)).toBe(true);
      expect(hasMinimumStoryRole(StoryRole.OWNER, StoryRole.OWNER)).toBe(true);
    });

    it('should deny CONTRIBUTOR for higher roles', () => {
      expect(hasMinimumStoryRole(StoryRole.CONTRIBUTOR, StoryRole.MODERATOR)).toBe(false);
      expect(hasMinimumStoryRole(StoryRole.CONTRIBUTOR, StoryRole.OWNER)).toBe(false);
    });

    it('should handle role hierarchy correctly', () => {
      expect(hasMinimumStoryRole(StoryRole.CO_AUTHOR, StoryRole.MODERATOR)).toBe(true);
      expect(hasMinimumStoryRole(StoryRole.MODERATOR, StoryRole.CO_AUTHOR)).toBe(false);
    });
  });

  describe('hasStoryPermission', () => {
    it('should allow OWNER all permissions', () => {
      expect(hasStoryPermission(StoryRole.OWNER, 'canDeleteStory')).toBe(true);
      expect(hasStoryPermission(StoryRole.OWNER, 'canRemoveCollaborators')).toBe(true);
    });

    it('should deny CO_AUTHOR delete story', () => {
      expect(hasStoryPermission(StoryRole.CO_AUTHOR, 'canDeleteStory')).toBe(false);
      expect(hasStoryPermission(StoryRole.CO_AUTHOR, 'canWriteChapters')).toBe(true);
    });

    it('should allow MODERATOR PR management', () => {
      expect(hasStoryPermission(StoryRole.MODERATOR, 'canApprovePRs')).toBe(true);
      expect(hasStoryPermission(StoryRole.MODERATOR, 'canRejectPRs')).toBe(true);
      expect(hasStoryPermission(StoryRole.MODERATOR, 'canEditStorySettings')).toBe(false);
    });

    it('should limit REVIEWER to review only', () => {
      expect(hasStoryPermission(StoryRole.REVIEWER, 'canReviewPRs')).toBe(true);
      expect(hasStoryPermission(StoryRole.REVIEWER, 'canApprovePRs')).toBe(false);
    });

    it('should allow CONTRIBUTOR write access', () => {
      expect(hasStoryPermission(StoryRole.CONTRIBUTOR, 'canWriteChapters')).toBe(true);
      expect(hasStoryPermission(StoryRole.CONTRIBUTOR, 'canApprovePRs')).toBe(false);
    });
  });
});
```

---

## Best Practices

### 1. Always Load Context First

```typescript
// CORRECT
preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canWriteChapters];

// WRONG - will fail because context not loaded
preHandler: [validateAuth, StoryRoleGuards.canWriteChapters];
```

### 2. Use Pre-built Guards When Possible

```typescript
// PREFERRED - more readable
preHandler: [validateAuth, PlatformRoleGuards.moderator];

// ALTERNATIVE - more flexible
preHandler: [validateAuth, requirePlatformRole(PlatformRole.PLATFORM_MODERATOR)];
```

### 3. Combine Platform and Story Checks

```typescript
// Platform moderators can bypass story permissions
preHandler: [
  validateAuth,
  loadStoryContext,
  requireStoryPermission('canDeleteComments', { allowPlatformOverride: true }),
];
```

### 4. Use Permission Utilities in Services

```typescript
// In service layer
const result = checkStoryPermission(userRole, 'canEditAnyChapter');
if (!result.allowed) {
  throw new ApiError(403, result.reason);
}
```

### 5. Log Permission Failures

All middleware automatically logs permission failures. For manual checks:

```typescript
if (!result.allowed) {
  logger.warn('Permission check failed', {
    userId,
    permission: 'canDeleteStory',
    reason: result.reason,
  });
}
```

### 6. Cache Collaborator Roles

For performance, consider caching collaborator roles:

```typescript
const cacheKey = `story:${storyId}:collaborator:${userId}`;
let role = await redis.get(cacheKey);

if (!role) {
  role = await getUserStoryRole(userId, storyId);
  if (role) {
    await redis.setex(cacheKey, 300, role); // 5 min cache
  }
}
```

---

## Permission Matrix Reference

### Platform Permissions Matrix

| Permission               | SUPER_ADMIN | PLATFORM_MOD | APPEAL_MOD | USER |
| ------------------------ | ----------- | ------------ | ---------- | ---- |
| canBanUsers              | Yes         | Yes          | No         | No   |
| canUnbanUsers            | Yes         | No           | Yes        | No   |
| canViewAllReports        | Yes         | Yes          | Yes        | No   |
| canDeleteAnyContent      | Yes         | Yes          | No         | No   |
| canReviewAppeals         | Yes         | Yes          | Yes        | No   |
| canApproveAppeals        | Yes         | No           | Yes        | No   |
| canRejectAppeals         | Yes         | Yes          | Yes        | No   |
| canManageRoles           | Yes         | No           | No         | No   |
| canAccessAdminPanel      | Yes         | Yes          | Yes        | No   |
| canManageSettings        | Yes         | No           | No         | No   |
| canManageFeaturedContent | Yes         | No           | No         | No   |

### Story Permissions Matrix

| Permission             | OWNER | CO_AUTHOR | MODERATOR | REVIEWER | CONTRIBUTOR |
| ---------------------- | ----- | --------- | --------- | -------- | ----------- |
| canEditStorySettings   | Yes   | Yes       | No        | No       | No          |
| canDeleteStory         | Yes   | No        | No        | No       | No          |
| canArchiveStory        | Yes   | Yes       | No        | No       | No          |
| canWriteChapters       | Yes   | Yes       | Yes       | Yes      | Yes         |
| canEditAnyChapter      | Yes   | Yes       | No        | No       | No          |
| canDeleteAnyChapter    | Yes   | Yes       | No        | No       | No          |
| canApprovePRs          | Yes   | Yes       | Yes       | No       | No          |
| canRejectPRs           | Yes   | Yes       | Yes       | No       | No          |
| canReviewPRs           | Yes   | Yes       | Yes       | Yes      | No          |
| canMergePRs            | Yes   | Yes       | Yes       | No       | No          |
| canInviteCollaborators | Yes   | Yes       | No        | No       | No          |
| canRemoveCollaborators | Yes   | No        | No        | No       | No          |
| canChangePermissions   | Yes   | No        | No        | No       | No          |
| canModerateComments    | Yes   | Yes       | Yes       | No       | No          |
| canDeleteComments      | Yes   | Yes       | Yes       | No       | No          |
| canBanFromStory        | Yes   | Yes       | Yes       | No       | No          |
| canViewStoryAnalytics  | Yes   | Yes       | No        | No       | No          |

---

## Related Documentation

- [Security Audit Report](./SECURITY_AUDIT.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)

---

_Last updated: December 2024_
