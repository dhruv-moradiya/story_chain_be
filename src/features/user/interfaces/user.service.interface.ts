import { SignInToken } from '@clerk/fastify';
import {
  ILoginUserDTO,
  ISearchUserByUsernameDTO,
  ISessionCreateDTO,
  IUserCreateDTO,
} from '@dto/user.dto';
import { IUser } from '../types/user.types';

export interface IUserService {
  loginUser(input: ILoginUserDTO): Promise<SignInToken>;
  createUser(input: IUserCreateDTO): Promise<IUser>;
  createSession(input: ISessionCreateDTO): void;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  searchUserByUsername(input: ISearchUserByUsernameDTO): Promise<IUser[]>;
}
