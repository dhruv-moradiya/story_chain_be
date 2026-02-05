import { ClientSession, Types } from 'mongoose';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';

type ID = string | Types.ObjectId;

// export enum PlatformRole {
//   SUPER_ADMIN = 'SUPER_ADMIN',
//   PLATFORM_MODERATOR = 'PLATFORM_MODERATOR',
//   APPEAL_MODERATOR = 'APPEAL_MODERATOR',
//   USER = 'USER',
// }

// export enum StoryRole {
//   OWNER = 'OWNER',
//   CO_AUTHOR = 'CO_AUTHOR',
//   MODERATOR = 'MODERATOR',
//   REVIEWER = 'REVIEWER',
//   CONTRIBUTOR = 'CONTRIBUTOR',
// }

interface IInviteTokenPayload {
  storyId: ID;
  role: TStoryCollaboratorRole;
  invitedBy: string;
  invitedAt: number;
  iat: number;
  exp: number;
}

interface IOperationOptions {
  session?: ClientSession;
  page?: number;
  limit?: number;
}

export type { ID, IOperationOptions, IInviteTokenPayload };
