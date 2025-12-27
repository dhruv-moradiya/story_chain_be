import { apiResponse, apiArrayResponse, errorResponse } from './helpers';

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
};
