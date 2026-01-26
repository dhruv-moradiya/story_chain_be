import { Document } from 'mongoose';
import { ALL_BADGES, AUTH_PROVIDER, AuthProvider } from './user-enum';

type TOAuthProvider = Exclude<AuthProvider, AuthProvider.EMAIL>;
type TAuthProvider = (typeof AUTH_PROVIDER)[number];
type TBadge = (typeof ALL_BADGES)[number];

interface IUserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}

interface IUserStats {
  storiesCreated: number;
  chaptersWritten: number;
  totalUpvotes: number;
  totalDownvotes: number;
  branchesCreated: number;
}

interface IConnectedAccount {
  provider: TAuthProvider;
  providerAccountId: string;
  email: string;
  username: string;
  avatarUrl?: string;
  connectedAt: Date;
}

interface IUser {
  clerkId: string;
  username: string;
  email: string;

  bio?: string;
  avatarUrl?: string;

  xp: number;
  level: number;
  badges: TBadge[];

  stats: IUserStats;
  preferences: IUserPreferences;

  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;

  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;

  authProvider: TAuthProvider;
  connectedAccounts: IConnectedAccount[];
  primaryAuthMethod: TAuthProvider;
  emailVerified: boolean;
}

interface ISession {
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

interface IUserDoc extends Document, IUser {}
interface ISessionDoc extends Document, ISession {}

interface ICreateNewUser {
  clerkId: string;
  username: string;
  email: string;
}

interface IUserUpdateInput {
  clerkId: string;
  username: string;
  email: string;
}

// DTOs
interface IClerkUserCreatedEventDTO {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
}

interface IClerkSessionCreatedEventDTO {
  sessionId: string;
  userId: string;
  clientId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

// const clerkUserCreatedSchema = z.object({
//   clerkId: z.string(),
//   email: z.string().email(),
//   firstName: z.string().optional(),
//   lastName: z.string().optional(),
//   username: z.string().optional(),
//   profileImage: z.string().url().optional(),
// });

// const clerkSessionCreatedSchema = z.object({
//   sessionId: z.string(),
//   userId: z.string(),
//   clientId: z.string(),
//   ip: z.string().nullable(),
//   userAgent: z.string().nullable(),
//   createdAt: z.date(),
//   lastActiveAt: z.date(),
// });

export type {
  TOAuthProvider,
  TAuthProvider,
  TBadge,
  IUserPreferences,
  IUserStats,
  IConnectedAccount,
  IUser,
  ISession,
  IUserDoc,
  ISessionDoc,
  ICreateNewUser,
  IUserUpdateInput,
  IClerkUserCreatedEventDTO,
  IClerkSessionCreatedEventDTO,
};
