import { Document, Types } from 'mongoose';

export interface IPlatformRole {
  userId: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_MODERATOR' | 'APPEAL_MODERATOR' | 'USER';
  assignedBy?: string;
  assignedAt: Date;
}

export interface IPlatformRoleDoc extends Document<Types.ObjectId>, IPlatformRole {}
