import { Document, Types } from 'mongoose';

export interface IFollow {
  _id: Types.ObjectId;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface IFollowDoc extends Document<Types.ObjectId>, IFollow {}
