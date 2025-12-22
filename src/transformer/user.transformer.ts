import { IUser } from '../features/user/user.types';
import {
  ICurrentUserResponse,
  IPublicUserResponse,
  IUserSearchItemResponse,
  IUserProfileResponse,
} from '../types/response/user.response.types';

export class UserTransformer {
  static currentUserResponse(input: IUser): ICurrentUserResponse {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      xp: input.xp,
      level: input.level,
      badges: input.badges,
      stats: input.stats,
      preferences: input.preferences,
      isActive: input.isActive,
      isBanned: input.isBanned,
      banReason: input.banReason,
      bannedUntil: input.bannedUntil,
      lastActive: input.lastActive,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  static publicUserResponse(input: IUser): IPublicUserResponse {
    return {
      clerkId: input.clerkId,
      username: input.username,
      email: input.email,
      avatarUrl: input.avatarUrl,
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
