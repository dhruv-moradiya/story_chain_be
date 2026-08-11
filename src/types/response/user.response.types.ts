import { Badge } from '@/features/user/types/user-enum';
import { TPlatformRole } from '@/features/platformRole/types/platformRole.types';
import { TBanType } from '@/features/banHistory/types/banHistory.types';
import {
  IConnectedAccount,
  IUserPreferences,
  IUserStats,
  TAuthProvider,
} from '@/features/user/types/user.types';
import { IStory } from '@/features/story/types/story.types';

// Public User Response (for search results, collaborator views)
interface IPublicUserResponse {
  clerkId: string;
  username: string;
  avatarUrl: string;
}

// Ban Details Response
interface IBanDetailsResponse {
  bannedBy: IPublicUserResponse;
  reason: string;
  durationDays?: number;
  banType: TBanType;
  expiresAt?: Date | string;
  createdAt: Date | string;
}

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
  isBanned: boolean;
  banDetails: IBanDetailsResponse | null;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
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

interface IUserBadgeDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
}

interface IUserAchievementsResponse {
  badges: IUserBadgeDetail[];
  level: number;
  levelTitle: string;
  xp: number;
  nextLevelXp: number;
}

interface IUserChapterWrittenItem {
  _id: string;
  title: string;
  slug: string;
  storySlug: string;
  storyTitle?: string;
  chapterNumber?: number;
  depth: number;
  status: string;
  votes?: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  stats?: {
    reads: number;
    comments: number;
    childBranches: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface IUserDetailPageResponse {
  user: {
    clerkId: string;
    username: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    level: number;
    levelTitle: string;
    xp: number;
    nextLevelXp: number;
    stats: IUserStats;
    isActive: boolean;
    lastActive: Date | string;
    createdAt: Date | string;
  };
  stories: IStory[];
  achievements: IUserAchievementsResponse;
  chaptersWritten: IUserChapterWrittenItem[];
}

export type {
  ICurrentUserResponse,
  IBanDetailsResponse,
  IPublicUserResponse,
  IPublicUserResponseWithEmail,
  IUserSearchItemResponse,
  IUserProfileResponse,
  IUserUpdateResponse,
  IFullUserResponse,
  IPaginatedUserData,
  IUserPaginatedResponse,
  IUserBadgeDetail,
  IUserAchievementsResponse,
  IUserChapterWrittenItem,
  IUserDetailPageResponse,
};
