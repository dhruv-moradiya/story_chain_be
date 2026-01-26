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

const LoginUserSchema = z.object({
  userId: UserIdSchema,
});

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

// User Create DTO Schema
const UserCreateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string(),
  avatarUrl: z.string().optional(),
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
type TLoginUserSchema = z.infer<typeof LoginUserSchema>;
type TSearchUserByUsernameSchema = z.infer<typeof SearchUserByUsernameSchema>;
type TGetUserByIdSchema = z.infer<typeof GetUserByIdSchema>;
type TGetUserByUsernameSchema = z.infer<typeof GetUserByUsernameSchema>;
type TUpdateUserProfileSchema = z.infer<typeof UpdateUserProfileSchema>;
type TUpdateUserPreferencesSchema = z.infer<typeof UpdateUserPreferencesSchema>;

export {
  UserIdSchema,
  UsernameSchema,
  LoginUserSchema,
  SearchUserByUsernameSchema,
  GetUserByIdSchema,
  GetUserByUsernameSchema,
  UpdateUserProfileSchema,
  UpdateUserPreferencesSchema,
  UserCreateDTO,
  SessionCreateDTO,
};

export type {
  TLoginUserSchema,
  TSearchUserByUsernameSchema,
  TGetUserByIdSchema,
  TGetUserByUsernameSchema,
  TUpdateUserProfileSchema,
  TUpdateUserPreferencesSchema,
};
