import { TPlatformRole } from '@/features/platformRole/types/platformRole.types';
import {
  ICurrentUserResponse,
  IFullUserResponse,
  IPaginatedUserData,
  IPublicUserResponseWithEmail,
  IUserProfileResponse,
  IUserSearchItemResponse,
} from '@/types/response/user.response.types';
import { IUser } from '@features/user/types/user.types';

export class UserTransformer {
  static currentUserResponse(
    input: IUser & { role: TPlatformRole }
  ): ICurrentUserResponse & { role: TPlatformRole } {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      role: input.role,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      xp: input.xp,
      level: input.level,
      badges: input.badges,
      stats: input.stats,
      preferences: input.preferences,
      isActive: input.isActive,
      lastActive: input.lastActive,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  static publicUserResponse(input: IUser): IPublicUserResponseWithEmail {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      avatarUrl: input.avatarUrl ?? '',
    };
  }

  static searchItemResponse(input: IUser): IUserSearchItemResponse {
    return this.publicUserResponse(input);
  }

  static profileResponse(input: IUser): IUserProfileResponse {
    return {
      clerkId: input.clerkId,
      username: input.username,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      xp: input.xp,
      level: input.level,
      badges: input.badges,
      stats: input.stats,
      createdAt: input.createdAt,
    };
  }

  static paginatedUserData(input: IUser): IPaginatedUserData {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      bio: input.bio ?? '',
      avatarUrl: input.avatarUrl ?? '',
      xp: input.xp ?? 0,
      level: input.level ?? 1,
      badges: (input.badges ?? []).map((badge) => String(badge)),
      stats: {
        storiesCreated: input.stats?.storiesCreated ?? 0,
        chaptersWritten: input.stats?.chaptersWritten ?? 0,
        totalUpvotes: input.stats?.totalUpvotes ?? 0,
        totalDownvotes: input.stats?.totalDownvotes ?? 0,
        branchesCreated: input.stats?.branchesCreated ?? 0,
      },
      preferences: {
        emailNotifications: input.preferences?.emailNotifications ?? true,
        pushNotifications: input.preferences?.pushNotifications ?? true,
        theme: input.preferences?.theme ?? 'auto',
      },
      isActive: input.isActive ?? true,
      lastActive: input.lastActive,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      connectedAccounts: (input.connectedAccounts ?? []).map((acc) => ({
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        email: acc.email,
        username: acc.username,
        avatarUrl: acc.avatarUrl,
        connectedAt: acc.connectedAt,
      })),
      primaryAuthMethod: input.primaryAuthMethod ?? 'email',
      emailVerified: input.emailVerified ?? false,
    };
  }

  static fullUserResponse(input: IUser & { role?: TPlatformRole }): IFullUserResponse {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      role: input.role ?? 'USER',
      bio: input.bio ?? '',
      avatarUrl: input.avatarUrl ?? '',
      xp: input.xp ?? 0,
      level: input.level ?? 1,
      badges: input.badges ?? [],
      stats: {
        storiesCreated: input.stats?.storiesCreated ?? 0,
        chaptersWritten: input.stats?.chaptersWritten ?? 0,
        totalUpvotes: input.stats?.totalUpvotes ?? 0,
        totalDownvotes: input.stats?.totalDownvotes ?? 0,
        branchesCreated: input.stats?.branchesCreated ?? 0,
      },
      preferences: {
        emailNotifications: input.preferences?.emailNotifications ?? true,
        pushNotifications: input.preferences?.pushNotifications ?? true,
        theme: input.preferences?.theme ?? 'auto',
      },
      isActive: input.isActive ?? true,
      lastActive: input.lastActive,
      authProvider: input.authProvider ?? 'email',
      connectedAccounts: (input.connectedAccounts ?? []).map((acc) => ({
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        email: acc.email,
        username: acc.username,
        avatarUrl: acc.avatarUrl,
        connectedAt: acc.connectedAt,
      })),
      primaryAuthMethod: input.primaryAuthMethod ?? 'email',
      emailVerified: input.emailVerified ?? false,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}

// Legacy mapper - kept for backwards compatibility
export class UserPublicMapper {
  static toPublic(user: IUser) {
    return {
      clerkId: user.clerkId.toString(),
      username: user.username,
      email: user.email,
    };
  }

  static toPublicList(users: IUser[]) {
    return users.map((u) => this.toPublic(u));
  }
}
