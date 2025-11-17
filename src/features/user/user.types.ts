import { Document } from 'mongoose';

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

export interface IUserDoc extends Document, IUser {}
export interface ISessionDoc extends Document, ISession {}

export interface ICreateNewUser {
  clerkId: string;
  username: string;
  email: string;
}

export interface IUserUpdateInput {
  clerkId: string;
  username: string;
  email: string;
}

// DTOs
export interface ClerkUserCreatedEventDTO {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
}

export interface ClerkSessionCreatedEventDTO {
  sessionId: string;
  userId: string;
  clientId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

// With validation
import { z } from 'zod';

export const clerkUserCreatedSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  profileImage: z.string().url().optional(),
});

export const clerkSessionCreatedSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  clientId: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
});

//
