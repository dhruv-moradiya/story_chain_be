import { Document, Types } from 'mongoose';

export interface ISession {
  _id: Types.ObjectId;
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

export interface ISessionDoc extends ISession, Document<Types.ObjectId> {}
