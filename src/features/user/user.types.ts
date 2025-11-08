import { Document } from 'mongoose';

// 🔹 Enums
export enum Badge {
  STORY_STARTER = 'STORY_STARTER',
  BRANCH_CREATOR = 'BRANCH_CREATOR',
  TOP_CONTRIBUTOR = 'TOP_CONTRIBUTOR',
  MOST_UPVOTED = 'MOST_UPVOTED',
  TRENDING_AUTHOR = 'TRENDING_AUTHOR',
  VETERAN_WRITER = 'VETERAN_WRITER',
  COMMUNITY_FAVORITE = 'COMMUNITY_FAVORITE',
  COLLABORATIVE = 'COLLABORATIVE',
  QUALITY_CURATOR = 'QUALITY_CURATOR',
}

// 🔹 Sub-interfaces
export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface UserStats {
  storiesCreated: number;
  chaptersWritten: number;
  totalUpvotes: number;
  totalDownvotes: number;
  branchesCreated: number;
}

// 🔹 Main interfaces
export interface IUser {
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

export interface ISession {
  sessionId: string;
  userId: string;
  clientId?: string;
  status: 'active' | 'ended' | 'revoked';
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  lastActiveAt?: Date;
  expireAt?: Date;
  abandonAt?: Date;
}

// 🔹 Document types
export interface IUserDoc extends Document, IUser {}
export interface ISessionDoc extends Document, ISession {}

// 🔹 DTOs
export interface SaveNewUser {
  clerkId: string;
  username: string;
  email: string;
}
