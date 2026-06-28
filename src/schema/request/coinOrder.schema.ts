import { z } from 'zod';

const CoinOrderCreateSchema = z.object({
  bundleSlug: z.string({ required_error: 'Bundle slug is required' }),
  couponCode: z.string().optional(),
  currency: z.enum(['INR', 'USD'], { required_error: 'Currency is required' }),
});

const CoinOrderVerifySchema = z.object({
  coinOrderId: z
    .string({ required_error: 'Coin order ID is required' })
    .trim()
    .min(1, 'Coin order ID is required'),

  razorpayPaymentId: z
    .string({ required_error: 'Razorpay payment ID is required' })
    .trim()
    .min(1, 'Razorpay payment ID is required'),

  razorpayOrderId: z
    .string({ required_error: 'Razorpay order ID is required' })
    .trim()
    .min(1, 'Razorpay order ID is required'),

  razorpaySignature: z
    .string({ required_error: 'Razorpay signature is required' })
    .trim()
    .min(1, 'Razorpay signature is required'),
});

export type CoinOrderVerifyInput = z.infer<typeof CoinOrderVerifySchema>;

type TCoinOrderCreateSchema = z.infer<typeof CoinOrderCreateSchema>;
type TCoinOrderVerifySchema = z.infer<typeof CoinOrderVerifySchema>;

export type { TCoinOrderCreateSchema, TCoinOrderVerifySchema };

export { CoinOrderCreateSchema, CoinOrderVerifySchema };
