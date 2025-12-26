import { apiResponse, apiArrayResponse, errorResponse } from './helpers';

// ===============================
// USER DATA SCHEMAS
// ===============================

export const UserSchema = {
  type: 'object',
  properties: {
    clerkId: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    role: { type: 'string', enum: ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] },
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
  currentUser: { 200: apiResponse(UserSchema, 'Current user details') },
  userProfile: {
    200: apiResponse(UserPublicSchema, 'Public user profile'),
    404: errorResponse('User not found'),
  },
  userList: { 200: apiArrayResponse(UserPublicSchema, 'List of matching users') },
};
