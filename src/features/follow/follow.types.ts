import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export interface IFollow {
  _id: ID;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface IFollowDoc extends Document, IFollow {
  _id: Types.ObjectId;
}
