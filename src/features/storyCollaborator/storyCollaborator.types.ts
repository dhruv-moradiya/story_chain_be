import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export interface IStoryCollaborator {
  _id: ID;
  storyId: ID;
  userId: string;
  role: 'OWNER' | 'CO_AUTHOR' | 'MODERATOR' | 'REVIEWER' | 'CONTRIBUTOR';
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStoryCollaboratorDoc extends IStoryCollaborator, Document {
  _id: Types.ObjectId;
}
