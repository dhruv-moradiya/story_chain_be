import { ProjectionType, UpdateQuery } from 'mongoose';
import { ICreateNewUser, IUser } from '../types/user.types';

export interface IUserRepository {
  createNewUser(input: ICreateNewUser): Promise<IUser>;
  findByClerkId(clerkId: string, projection?: ProjectionType<IUser> | null): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser[]>;
  findOneByUsername(username: string): Promise<IUser | null>;
  updateByClerkId(id: string, update: UpdateQuery<IUser>): Promise<IUser | null>;
  updateXP(clerkId: string, updates: UpdateQuery<IUser>): Promise<IUser | null>;
  addBadge(clerkId: string, badge: string): Promise<IUser | null>;
  countAllUsers(options?: { session?: unknown }): Promise<number>;
}
