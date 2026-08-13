import { z } from 'zod';
import {
  UserCreateDTO,
  SessionCreateDTO,
  UserUpdateDTO,
  ConnectedAccountSchema,
} from '@schema/request/user.schema';
import { TPlatformRole } from '@/features/platformRole/types/platformRole.types';

interface ISearchUserByUsernameDTO {
  username: string;
}

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type IUserUpdateDTO = z.infer<typeof UserUpdateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;
type IConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

type IBanUserDTO = {
  userId: string;
  reviewerId: string;
  reason: string;
  durationDays?: number;
};

interface IChangeUserRoleDTO {
  currentUserId: string;
  userId: string;
  role: TPlatformRole;
}

export type {
  IUserCreateDTO,
  IUserUpdateDTO,
  ISessionCreateDTO,
  ISearchUserByUsernameDTO,
  IConnectedAccount,
  IBanUserDTO,
  IChangeUserRoleDTO,
};
