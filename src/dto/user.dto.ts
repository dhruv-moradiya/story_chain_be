import { z } from 'zod';

const UserCreateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string(),
  avatarUrl: z.string().optional(),
});

const SessionCreateDTO = z.object({
  sessionId: z.string(),
  userId: z.string(),
  clientId: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  lastActiveAt: z.date(),
});

interface ILoginUserDTO {
  userId: string;
}

interface ISearchUserByUsernameDTO {
  username: string;
}

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;

export { UserCreateDTO, SessionCreateDTO };
export type { IUserCreateDTO, ISessionCreateDTO, ISearchUserByUsernameDTO, ILoginUserDTO };
