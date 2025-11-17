import { Document, Types } from 'mongoose';

export interface IStoryCollaborator {
  _id: Types.ObjectId;
  storyId: Types.ObjectId;
  userId: string;
  role: 'OWNER' | 'CO_AUTHOR' | 'MODERATOR' | 'REVIEWER' | 'CONTRIBUTOR';
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStoryCollaboratorDoc extends IStoryCollaborator, Document<Types.ObjectId> {}
