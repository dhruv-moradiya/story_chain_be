import { z } from 'zod';

export const createStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters'),

  slug: z.string().trim().toLowerCase().min(3, 'Slug must be at least 3 characters long'),

  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters'),

  coverImage: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().optional(),
    })
    .optional(),

  settings: z
    .object({
      isPublic: z.boolean().default(true),
      allowBranching: z.boolean().default(true),
      requireApproval: z.boolean().default(false),
      allowComments: z.boolean().default(true),
      allowVoting: z.boolean().default(true),
      genre: z
        .enum([
          'FANTASY',
          'SCI_FI',
          'MYSTERY',
          'ROMANCE',
          'HORROR',
          'THRILLER',
          'ADVENTURE',
          'DRAMA',
          'COMEDY',
          'OTHER',
        ])
        .default('OTHER'),
      contentRating: z.enum(['GENERAL', 'TEEN', 'MATURE']).default('GENERAL'),
    })
    .default({}),

  tags: z.array(z.string().trim().toLowerCase()).default([]),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).default('PUBLISHED'),
});

export const updateStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters long')
    .optional(),

  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),

  coverImage: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().optional(),
    })
    .optional(),

  settings: z
    .object({
      isPublic: z.boolean().optional(),
      allowBranching: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      allowVoting: z.boolean().optional(),
      genre: z
        .enum([
          'FANTASY',
          'SCI_FI',
          'MYSTERY',
          'ROMANCE',
          'HORROR',
          'THRILLER',
          'ADVENTURE',
          'DRAMA',
          'COMEDY',
          'OTHER',
        ])
        .optional(),
      contentRating: z.enum(['GENERAL', 'TEEN', 'MATURE']).optional(),
    })
    .partial()
    .optional(),

  tags: z.array(z.string().trim().toLowerCase()).optional(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED']).optional(),

  trendingScore: z.number().optional(),
  lastActivityAt: z.date().optional(),
  publishedAt: z.date().optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;

export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
