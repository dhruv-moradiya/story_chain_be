import { Badge, UserPreferences, UserStats } from '@features/user/types/user.types';

// Current User Response
interface ICurrentUserResponse {
  clerkId: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  badges: Badge[];
  stats: UserStats;
  preferences: UserPreferences;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Public User Response (for search results, collaborator views)
interface IPublicUserResponse {
  clerkId: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

// User Search Response Item
interface IUserSearchItemResponse {
  clerkId: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

// User Profile Response (for public profile view)
interface IUserProfileResponse {
  clerkId: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  badges: Badge[];
  stats: UserStats;
  createdAt: Date;
}

// User Update Response
interface IUserUpdateResponse {
  clerkId: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  updatedAt: Date;
}

export type {
  ICurrentUserResponse,
  IPublicUserResponse,
  IUserSearchItemResponse,
  IUserProfileResponse,
  IUserUpdateResponse,
};
