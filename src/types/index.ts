import { ClientSession, Types } from 'mongoose';

export type ID = string | Types.ObjectId;

export enum PlatformRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_MODERATOR = 'PLATFORM_MODERATOR',
  APPEAL_MODERATOR = 'APPEAL_MODERATOR',
  USER = 'USER',
}

export enum StoryRole {
  OWNER = 'OWNER',
  CO_AUTHOR = 'CO_AUTHOR',
  MODERATOR = 'MODERATOR',
  REVIEWER = 'REVIEWER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export interface IOperationOptions {
  session?: ClientSession;
}
