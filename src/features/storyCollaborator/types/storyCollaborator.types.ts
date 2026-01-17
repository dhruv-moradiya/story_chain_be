import { ID } from '@/types';
import { Document, Types } from 'mongoose';
import { STORY_COLLABORATOR_ROLES, STORY_COLLABORATOR_STATUSES } from './storyCollaborator-enum';

type TStoryCollaboratorRole = (typeof STORY_COLLABORATOR_ROLES)[number];

type TStoryCollaboratorStatus = (typeof STORY_COLLABORATOR_STATUSES)[number];

type TStoryCollaboratorPermission =
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

interface IStoryCollaborator {
  _id: ID;
  slug: string;
  userId: string;
  role: TStoryCollaboratorRole;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: TStoryCollaboratorStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IStoryCollaboratorDoc extends IStoryCollaborator, Document {
  _id: Types.ObjectId;
}

export type {
  IStoryCollaborator,
  IStoryCollaboratorDoc,
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
};
