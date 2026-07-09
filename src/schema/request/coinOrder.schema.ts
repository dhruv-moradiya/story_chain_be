import { z } from 'zod';

// Fix #6: bundleSlug must be a non-empty slug-safe string (no injections or blanks)
const CoinOrderCreateSchema = z.object({
  bundleSlug: z
    .string({ required_error: 'Bundle slug is required' })
    .trim()
    .min(1, 'Bundle slug cannot be empty')
    .max(100, 'Bundle slug is too long')
    .regex(/^[a-z0-9-_]+$/, 'Bundle slug contains invalid characters'),
  couponCode: z.string().optional(),
  currency: z.enum(['INR', 'USD'], { required_error: 'Currency is required' }),
});

// Fix #7: Validate Razorpay-specific ID and signature formats upfront.
// This rejects malformed values before any HMAC computation is attempted.
const CoinOrderVerifySchema = z.object({
  coinOrderId: z
    .string({ required_error: 'Coin order ID is required' })
    .trim()
    .min(1, 'Coin order ID is required'),

  // Razorpay payment IDs always start with "pay_"
  razorpayPaymentId: z
    .string({ required_error: 'Razorpay payment ID is required' })
    .trim()
    .min(1, 'Razorpay payment ID is required')
    .regex(/^pay_[A-Za-z0-9]+$/, 'Invalid Razorpay payment ID format'),

  // Razorpay order IDs always start with "order_"
  razorpayOrderId: z
    .string({ required_error: 'Razorpay order ID is required' })
    .trim()
    .min(1, 'Razorpay order ID is required')
    .regex(/^order_[A-Za-z0-9]+$/, 'Invalid Razorpay order ID format'),

  // Signature is always a 64-character lowercase hex string (HMAC-SHA256)
  razorpaySignature: z
    .string({ required_error: 'Razorpay signature is required' })
    .trim()
    .length(64, 'Signature must be exactly 64 hex characters')
    .regex(/^[a-f0-9]{64}$/, 'Signature must be a valid lowercase hex string'),
});

export type CoinOrderVerifyInput = z.infer<typeof CoinOrderVerifySchema>;

type TCoinOrderCreateSchema = z.infer<typeof CoinOrderCreateSchema>;
type TCoinOrderVerifySchema = z.infer<typeof CoinOrderVerifySchema>;

export type { TCoinOrderCreateSchema, TCoinOrderVerifySchema };

export { CoinOrderCreateSchema, CoinOrderVerifySchema };
