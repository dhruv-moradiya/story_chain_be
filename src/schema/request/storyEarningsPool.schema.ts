import { z } from 'zod';

export const DistributeCoinsSchema = z.array(
  z.object({
    collaboratorId: z.string(),
    coin: z.number().int().positive(),
  })
);
export type TDistributeCoinsSchema = z.infer<typeof DistributeCoinsSchema>;
