import { z } from 'zod';

const SearchUserByUsernameSchema = z.object({
  username: z.string(),
});

type TSearchUserByUsernameSchema = z.infer<typeof SearchUserByUsernameSchema>;

export { SearchUserByUsernameSchema };

export type { TSearchUserByUsernameSchema };
