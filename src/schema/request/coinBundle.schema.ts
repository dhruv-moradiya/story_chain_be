import { z } from 'zod';
import {
  BUNDLE_TYPES,
  RESTRICTION_TYPES,
  SUPPORTED_CURRENCIES,
} from '@features/coinBundle/types/coinBundle-enum';

const ThumbnailSchema = z.object({
  url: z.string().url('thumbnail.url must be a valid URL'),
  publicId: z.string().min(1, 'thumbnail.publicId is required'),
});

const RestrictionsSchema = z.object({
  type: z.enum(RESTRICTION_TYPES).default('unlimited'),
  dailyLimit: z.number().int().positive().optional(),
  monthlyLimit: z.number().int().positive().optional(),
  lifetimeLimit: z.number().int().positive().optional(),
  firstPurchaseOnly: z.boolean().default(false),
  perUserLimit: z.number().int().min(1).optional(),
});

const CoinBundleCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(100, 'name must be ≤ 100 chars'),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be a valid URL slug')
      .optional(),

    description: z.string().trim().max(500, 'description must be ≤ 500 chars').optional(),

    bundleType: z.enum(BUNDLE_TYPES, {
      errorMap: () => ({ message: `bundleType must be one of: ${BUNDLE_TYPES.join(', ')}` }),
    }),

    baseCoins: z.number().int().min(1, 'baseCoins must be ≥ 1'),

    bonusCoins: z.number().int().min(0).default(0),

    inrPrice: z.number().int().min(0, 'inrPrice must be ≥ 0 (in paise)'),

    usdPrice: z.number().int().min(0).default(0),

    currencies: z
      .array(z.enum(SUPPORTED_CURRENCIES))
      .min(1, 'currencies must have at least 1 item'),

    thumbnail: ThumbnailSchema.optional(),

    isFeatured: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    displayOrder: z.number().int().min(0).default(0),

    promotionalBadge: z.string().trim().max(50, 'promotionalBadge must be ≤ 50 chars').optional(),

    marketingTagline: z.string().trim().max(150, 'marketingTagline must be ≤ 150 chars').optional(),

    isActive: z.boolean().default(true),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}:\d{2}$/, 'startTime must be in HH:mm:ss format')
      .optional(),

    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}:\d{2}$/, 'endTime must be in HH:mm:ss format')
      .optional(),

    timezone: z.string().default('Asia/Kolkata'),

    restrictions: RestrictionsSchema.optional().default({}),
  })
  .superRefine((data, ctx) => {
    // endDate must be after startDate if both are provided
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'endDate must be after startDate',
      });
    }

    // USD in currencies but usdPrice is 0
    if (data.currencies.includes('USD') && data.usdPrice === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['usdPrice'],
        message: 'usdPrice must be > 0 when USD is included in currencies',
      });
    }

    // Restriction-specific limits
    const r = data.restrictions;
    if (r) {
      if (r.type === 'daily' && (r.dailyLimit === undefined || r.dailyLimit === null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['restrictions', 'dailyLimit'],
          message: 'dailyLimit is required when restrictions.type is "daily"',
        });
      }

      if (r.type === 'monthly' && (r.monthlyLimit === undefined || r.monthlyLimit === null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['restrictions', 'monthlyLimit'],
          message: 'monthlyLimit is required when restrictions.type is "monthly"',
        });
      }

      if (r.type === 'lifetime' && (r.lifetimeLimit === undefined || r.lifetimeLimit === null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['restrictions', 'lifetimeLimit'],
          message: 'lifetimeLimit is required when restrictions.type is "lifetime"',
        });
      }
    }
  });

type TCoinBundleCreateSchema = z.infer<typeof CoinBundleCreateSchema>;

export { CoinBundleCreateSchema };
export type { TCoinBundleCreateSchema };
