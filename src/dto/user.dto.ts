import { z } from 'zod';
import {
  UserCreateDTO,
  SessionCreateDTO,
  UserUpdateDTO,
  ConnectedAccountSchema,
} from '@schema/request/user.schema';

interface ISearchUserByUsernameDTO {
  username: string;
}

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type IUserUpdateDTO = z.infer<typeof UserUpdateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;
type IConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

export type {
  IUserCreateDTO,
  IUserUpdateDTO,
  ISessionCreateDTO,
  ISearchUserByUsernameDTO,
  IConnectedAccount,
};
