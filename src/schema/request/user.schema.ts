import { z } from 'zod';

// User ID Schema
const UserIdSchema = z.string({
  required_error: 'userId is required.',
  invalid_type_error: 'userId must be a string.',
});

// Username Schema
const UsernameSchema = z
  .string({
    required_error: 'username is required.',
    invalid_type_error: 'username must be a string.',
  })
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username cannot exceed 30 characters.');

// Search User By Username Schema
const SearchUserByUsernameSchema = z.object({
  username: z
    .string({
      required_error: 'username is required.',
      invalid_type_error: 'username must be a string.',
    })
    .min(1, 'Username search query cannot be empty.'),
});

// Get User By Id Schema
const GetUserByIdSchema = z.object({
  userId: UserIdSchema,
});

// Get User By Username Schema
const GetUserByUsernameSchema = z.object({
  username: UsernameSchema,
});

// Update User Profile Schema
const UpdateUserProfileSchema = z.object({
  bio: z.string().max(500, 'Bio cannot exceed 500 characters.').optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL.').optional(),
});

// Update User Preferences Schema
const UpdateUserPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
});

const ConnectedAccountSchema = z.object({
  provider: z.enum(['google', 'github', 'discord']),
  providerAccountId: z.string(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  connectedAt: z.date().default(() => new Date()),
});

// User Create DTO Schema
const UserCreateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string(),
  avatarUrl: z.string().optional(),

  // OAuth fields
  authProvider: z.enum(['email', 'google', 'github', 'discord']).default('email'),
  primaryAuthMethod: z.enum(['email', 'google', 'github', 'discord']).default('email'),
  connectedAccounts: z.array(ConnectedAccountSchema).default([]),
  emailVerified: z.boolean().default(false),

  // Optional profile fields from OAuth
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// User Update DTO Schema
const UserUpdateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  connectedAccounts: z.array(ConnectedAccountSchema).optional(),
  emailVerified: z.boolean().optional(),
});

// Session Create DTO Schema
const SessionCreateDTO = z.object({
  sessionId: z.string(),
  userId: z.string(),
  clientId: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
});

// Type exports
type TSearchUserByUsernameSchema = z.infer<typeof SearchUserByUsernameSchema>;
type TGetUserByIdSchema = z.infer<typeof GetUserByIdSchema>;
type TGetUserByUsernameSchema = z.infer<typeof GetUserByUsernameSchema>;
type TUpdateUserProfileSchema = z.infer<typeof UpdateUserProfileSchema>;
type TUpdateUserPreferencesSchema = z.infer<typeof UpdateUserPreferencesSchema>;

export {
  UserIdSchema,
  UsernameSchema,
  SearchUserByUsernameSchema,
  GetUserByIdSchema,
  GetUserByUsernameSchema,
  UpdateUserProfileSchema,
  UpdateUserPreferencesSchema,
  UserCreateDTO,
  UserUpdateDTO,
  ConnectedAccountSchema,
  SessionCreateDTO,
};

export type {
  TSearchUserByUsernameSchema,
  TGetUserByIdSchema,
  TGetUserByUsernameSchema,
  TUpdateUserProfileSchema,
  TUpdateUserPreferencesSchema,
};
