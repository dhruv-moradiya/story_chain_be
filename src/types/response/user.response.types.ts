import { Badge } from '@/features/user/types/user-enum';
import { TPlatformRole } from '@/features/platformRole/types/platformRole.types';
import {
  IConnectedAccount,
  IUserPreferences,
  IUserStats,
  TAuthProvider,
} from '@/features/user/types/user.types';

// Current User Response
interface ICurrentUserResponse {
  clerkId: string;
  username: string;
  email: string;
  role: TPlatformRole;
  bio?: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  badges: Badge[];
  stats: IUserStats;
  preferences: IUserPreferences;
  isActive: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Public User Response (for search results, collaborator views)
interface IPublicUserResponse {
  clerkId: string;
  username: string;
  avatarUrl: string;
}

interface IPublicUserResponseWithEmail extends IPublicUserResponse {
  email: string;
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
  stats: IUserStats;
  createdAt: Date;
}

// User Update Response
interface IUserUpdateResponse {
  clerkId: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  preferences: IUserPreferences;
  updatedAt: Date;
}

// Full User Response (contains all fields from User model)
interface IFullUserResponse {
  clerkId: string;
  username: string;
  email: string;
  role?: TPlatformRole;
  bio?: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  badges: Badge[];
  stats: IUserStats;
  preferences: IUserPreferences;
  isActive: boolean;
  lastActive: Date;
  authProvider: string;
  connectedAccounts: Array<{
    provider: string;
    providerAccountId: string;
    email?: string;
    username?: string;
    avatarUrl?: string;
    connectedAt: Date;
  }>;
  primaryAuthMethod: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Paginated User Item Response
interface IPaginatedUserData {
  clerkId: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string;
  xp: number;
  level: number;
  badges: string[];
  stats: IUserStats;
  preferences: IUserPreferences;
  isActive: boolean;
  lastActive: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  connectedAccounts: IConnectedAccount[];
  primaryAuthMethod: TAuthProvider;
  emailVerified: boolean;
}

// Paginated User List Response
interface IUserPaginatedResponse {
  docs: IPaginatedUserData[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export type {
  ICurrentUserResponse,
  IPublicUserResponse,
  IPublicUserResponseWithEmail,
  IUserSearchItemResponse,
  IUserProfileResponse,
  IUserUpdateResponse,
  IFullUserResponse,
  IPaginatedUserData,
  IUserPaginatedResponse,
};
