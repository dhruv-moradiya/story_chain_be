import { Document, Types } from 'mongoose';
import { ID } from '../../types';

export interface ISession {
  _id: ID;
  sessionId: string;
  userId: string;
  clientId?: string;
  status: 'active' | 'ended' | 'revoked';
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  lastActiveAt?: Date;
  expireAt?: Date;
  abandonAt?: Date;
}

export interface ISessionDoc extends ISession, Document {
  _id: Types.ObjectId;
}
