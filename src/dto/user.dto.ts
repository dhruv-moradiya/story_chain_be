import { z } from 'zod';
import { UserCreateDTO, SessionCreateDTO } from '@schema/user.schema';

interface ILoginUserDTO {
  userId: string;
}

interface ISearchUserByUsernameDTO {
  username: string;
}

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;

export type { IUserCreateDTO, ISessionCreateDTO, ISearchUserByUsernameDTO, ILoginUserDTO };
