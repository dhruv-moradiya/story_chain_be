import { z } from 'zod';

const UserCreateDTO = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  username: z.string(),
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

type IUserCreateDTO = z.infer<typeof UserCreateDTO>;
type ISessionCreateDTO = z.infer<typeof SessionCreateDTO>;

export { UserCreateDTO, SessionCreateDTO };
export type { IUserCreateDTO, ISessionCreateDTO };
