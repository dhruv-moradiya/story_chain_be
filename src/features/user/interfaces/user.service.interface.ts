import {
  IChangeUserRoleDTO,
  ISearchUserByUsernameDTO,
  ISessionCreateDTO,
  IUserCreateDTO,
} from '@dto/user.dto';
import { IUser } from '../types/user.types';
import { TGetUsersListQuerySchema } from '@/schema/request/user.schema';
import {
  IUserDetailPageResponse,
  IUserPaginatedResponse,
} from '@/types/response/user.response.types';

import { IBanHistoryPopulated } from '@/features/banHistory/types/banHistory.types';
import type { User } from '@clerk/fastify';

export interface IUserService {
  createUser(input: IUserCreateDTO): Promise<IUser>;
  createSession(input: ISessionCreateDTO): void;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  getUserActiveBan(userId: string): Promise<IBanHistoryPopulated | null>;
  searchUserByUsername(input: ISearchUserByUsernameDTO): Promise<IUser[]>;
  getPaginatedUsers(query: TGetUsersListQuerySchema): Promise<IUserPaginatedResponse>;
  getUserDetailPageDataByClerkId(clerkId: string): Promise<IUserDetailPageResponse>;
  syncConnectedAccounts(clerkId: string, externalAccounts: User['externalAccounts']): Promise<void>;
  changeUserRole(input: IChangeUserRoleDTO): Promise<boolean>;
  dropCollectionsExceptUsersAndRoles(): Promise<{ droppedCollections: string[] }>;
}
