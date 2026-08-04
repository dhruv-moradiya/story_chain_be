import { ISearchUserByUsernameDTO, ISessionCreateDTO, IUserCreateDTO } from '@dto/user.dto';
import { IUser } from '../types/user.types';
import { TGetUsersListQuerySchema } from '@/schema/request/user.schema';
import { IUserPaginatedResponse } from '@/types/response/user.response.types';

import type { User } from '@clerk/fastify';

export interface IUserService {
  createUser(input: IUserCreateDTO): Promise<IUser>;
  createSession(input: ISessionCreateDTO): void;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  searchUserByUsername(input: ISearchUserByUsernameDTO): Promise<IUser[]>;
  getPaginatedUsers(query: TGetUsersListQuerySchema): Promise<IUserPaginatedResponse>;
  syncConnectedAccounts(clerkId: string, externalAccounts: User['externalAccounts']): Promise<void>;
}
