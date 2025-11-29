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

type TStoryAddChapterStatus = keyof typeof StoryCollaboratorStatus;

export interface IStoryCollaborator {
  _id: ID;
  storyId: ID;
  userId: string;
  role: TStoryCollaboratorRole;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: TStoryAddChapterStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStoryCollaboratorDoc extends IStoryCollaborator, Document {
  _id: Types.ObjectId;
}
