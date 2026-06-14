import { z } from 'zod';

const CoinOrderCreateSchema = z.object({
  bundleSlug: z.string({ required_error: 'Bundle slug is required' }),
  couponCode: z.string().optional(),
  currency: z.enum(['INR', 'USD'], { required_error: 'Currency is required' }),
});

type TCoinOrderCreateSchema = z.infer<typeof CoinOrderCreateSchema>;

export type { TCoinOrderCreateSchema };

export { CoinOrderCreateSchema };
