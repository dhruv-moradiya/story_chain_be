import { apiResponse, apiArrayResponse, apiPaginatedResponse, errorResponse } from './helpers';

// ===============================
// USER DATA SCHEMAS
// ===============================

export const UserLoginSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    token: { type: 'string' },
    status: { type: 'string' },
    url: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
};

export const UserSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    xp: { type: 'number' },
    level: { type: 'number' },
    badges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          iconUrl: { type: 'string' },
        },
      },
    },
    stats: {
      type: 'object',
      properties: {
        storiesPublished: { type: 'number' },
        chaptersPublished: { type: 'number' },
        totalReads: { type: 'number' },
        totalClaps: { type: 'number' },
      },
    },
    preferences: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        notificationsEnabled: { type: 'boolean' },
      },
    },
    isActive: { type: 'boolean' },
    isBanned: { type: 'boolean' },
    banDetails: {
      type: ['object', 'null'],
      nullable: true,
      properties: {
        bannedBy: {
          type: 'object',
          properties: {
            clerkId: { type: 'string' },
            username: { type: 'string' },
            avatarUrl: { type: 'string' },
          },
        },
        reason: { type: 'string' },
        durationDays: { type: 'number', nullable: true },
        banType: { type: 'string', enum: ['TEMPORARY', 'PERMANENT'] },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    lastActive: { type: 'string', format: 'date-time' },

    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    role: {
      type: 'string',
      enum: ['USER', 'APPEAL_MODERATOR', 'PLATFORM_MODERATOR', 'SUPER_ADMIN'],
    },
  },
};

export const FullUserSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    role: {
      type: 'string',
      enum: ['USER', 'APPEAL_MODERATOR', 'PLATFORM_MODERATOR', 'SUPER_ADMIN'],
    },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    xp: { type: 'number' },
    level: { type: 'number' },
    badges: {
      type: 'array',
      items: { type: 'string' },
    },
    stats: {
      type: 'object',
      properties: {
        storiesCreated: { type: 'number' },
        chaptersWritten: { type: 'number' },
        totalUpvotes: { type: 'number' },
        totalDownvotes: { type: 'number' },
        branchesCreated: { type: 'number' },
      },
    },
    preferences: {
      type: 'object',
      properties: {
        emailNotifications: { type: 'boolean' },
        pushNotifications: { type: 'boolean' },
        theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
      },
    },
    isActive: { type: 'boolean' },
    lastActive: { type: 'string', format: 'date-time' },
    authProvider: { type: 'string' },
    connectedAccounts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          providerAccountId: { type: 'string' },
          email: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string' },
          connectedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    primaryAuthMethod: { type: 'string' },
    emailVerified: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const PaginatedUserDataSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    xp: { type: 'number' },
    level: { type: 'number' },
    badges: {
      type: 'array',
      items: { type: 'string' },
    },
    stats: {
      type: 'object',
      properties: {
        storiesCreated: { type: 'number' },
        chaptersWritten: { type: 'number' },
        totalUpvotes: { type: 'number' },
        totalDownvotes: { type: 'number' },
        branchesCreated: { type: 'number' },
      },
    },
    preferences: {
      type: 'object',
      properties: {
        emailNotifications: { type: 'boolean' },
        pushNotifications: { type: 'boolean' },
        theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
      },
    },
    isActive: { type: 'boolean' },
    lastActive: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    connectedAccounts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          providerAccountId: { type: 'string' },
          email: { type: 'string' },
          username: { type: 'string' },
          avatarUrl: { type: 'string' },
          connectedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    primaryAuthMethod: { type: 'string' },
    emailVerified: { type: 'boolean' },
  },
};

export const UserPublicSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    avatarUrl: { type: 'string' },
  },
};

// ===============================
// USER RESPONSE OBJECTS
// ===============================

export const UserResponses = {
  login: {
    200: apiResponse(UserLoginSchema, 'Sign-in token for user login'),
    422: errorResponse('Invalid request parameters'),
  },
  currentUser: { 200: apiResponse(UserSchema, 'Current user details') },
  userProfile: {
    200: apiResponse(UserPublicSchema, 'Public user profile'),
    404: errorResponse('User not found'),
  },
  userList: { 200: apiArrayResponse(UserPublicSchema, 'List of matching users') },
  paginatedUserList: {
    200: apiPaginatedResponse(PaginatedUserDataSchema, 'Paginated list of users data'),
  },
};
