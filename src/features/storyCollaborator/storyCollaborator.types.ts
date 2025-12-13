import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export enum StoryCollaboratorRole {
  OWNER = 'OWNER',
  CO_AUTHOR = 'CO_AUTHOR',
  MODERATOR = 'MODERATOR',
  REVIEWER = 'REVIEWER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export type TStoryCollaboratorRole = keyof typeof StoryCollaboratorRole;

export const ROLE_HIERARCHY = {
  CONTRIBUTOR: 0,
  REVIEWER: 1,
  MODERATOR: 2,
  CO_AUTHOR: 3,
  OWNER: 4,
};

export enum StoryCollaboratorStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  REMOVED = 'REMOVED',
}

export type TStoryCollaboratorStatus = keyof typeof StoryCollaboratorStatus;

export type TStoryCollaboratorPermission =
  | 'canEditStorySettings'
  | 'canDeleteStory'
  | 'canArchiveStory'
  | 'canWriteChapters'
  | 'canEditAnyChapter'
  | 'canDeleteAnyChapter'
  | 'canApprovePRs'
  | 'canRejectPRs'
  | 'canReviewPRs'
  | 'canMergePRs'
  | 'canInviteCollaborators'
  | 'canRemoveCollaborators'
  | 'canChangePermissions'
  | 'canModerateComments'
  | 'canDeleteComments'
  | 'canBanFromStory'
  | 'canViewStoryAnalytics';

export interface IStoryCollaborator {
  _id: ID;
  storyId: ID;
  userId: string;
  role: TStoryCollaboratorRole;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: TStoryCollaboratorStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStoryCollaboratorDoc extends IStoryCollaborator, Document {
  _id: Types.ObjectId;
}
