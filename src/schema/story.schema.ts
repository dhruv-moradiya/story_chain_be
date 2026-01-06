import { z } from 'zod';
import { ObjectIdSchema } from '../utils';
import { CHAPTER_LIMITS, cloudinaryUrlRegex } from '../constants';

const StoryIdSchema = z.object({
  storyId: ObjectIdSchema(),
});

const StorySlugSchema = z.object({
  slug: z.string(),
});

const StoryCreateSchema = z.object({
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

const StoryUpdateSchema = z.object({
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

const StoryAddChapterSchema = z.object({
  // storyId: ObjectIdSchema().transform((s) => s.trim()),
  parentChapterId: ObjectIdSchema()
    .transform((s) => s.trim())
    .nullable(),
  title: z
    .string()
    .min(CHAPTER_LIMITS.TITLE.MIN_LENGTH, {
      message: `Title must be at least ${CHAPTER_LIMITS.TITLE.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.TITLE.MAX_LENGTH, {
      message: `Title must be at most ${CHAPTER_LIMITS.TITLE.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
  content: z
    .string()
    .min(CHAPTER_LIMITS.CONTENT.MIN_LENGTH, {
      message: `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.CONTENT.MAX_LENGTH, {
      message: `Content must be at most ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});

const StoryAddChapterBySlugSchema = z.object({
  parentChapterId: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((val) => val === 'root' || /^[a-f\d]{24}$/i.test(val), {
      message: 'parentChapterId must be "root" or a valid ObjectId',
    })
    .transform((val) => (val === 'root' ? null : val)),
  title: z
    .string()
    .min(CHAPTER_LIMITS.TITLE.MIN_LENGTH, {
      message: `Title must be at least ${CHAPTER_LIMITS.TITLE.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.TITLE.MAX_LENGTH, {
      message: `Title must be at most ${CHAPTER_LIMITS.TITLE.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
  content: z
    .string()
    .min(CHAPTER_LIMITS.CONTENT.MIN_LENGTH, {
      message: `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.CONTENT.MAX_LENGTH, {
      message: `Content must be at most ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});

const StoryUpdateChapterTitleSchema = z.object({
  title: z
    .string()
    .min(CHAPTER_LIMITS.TITLE.MIN_LENGTH, {
      message: `Title must be at least ${CHAPTER_LIMITS.TITLE.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.TITLE.MAX_LENGTH, {
      message: `Title must be at most ${CHAPTER_LIMITS.TITLE.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});

const StoryUpdateChapterContentSchema = z.object({
  content: z
    .string()
    .min(CHAPTER_LIMITS.CONTENT.MIN_LENGTH, {
      message: `Content must be at least ${CHAPTER_LIMITS.CONTENT.MIN_LENGTH} characters`,
    })
    .max(CHAPTER_LIMITS.CONTENT.MAX_LENGTH, {
      message: `Content must be at most ${CHAPTER_LIMITS.CONTENT.MAX_LENGTH} characters`,
    })
    .transform((s) => s.trim()),
});

const StoryCreateInviteLinkSchema = z.object({
  role: z.enum(['CO_AUTHOR', 'MODERATOR', 'REVIEWER', 'CONTRIBUTOR']),
  invitedUserId: z.string(),
  invitedUserName: z.string(),
});

const GenreEnum = z.enum(
  [
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
  ],
  {
    errorMap: () => ({
      message: 'Invalid genre selected. Please choose a valid genre option.',
    }),
  }
);

const ContentRatingEnum = z.enum(['GENERAL', 'TEEN', 'MATURE'], {
  errorMap: () => ({
    message: 'Invalid content rating. Allowed values are GENERAL, TEEN, or MATURE.',
  }),
});

const StoryUpdateSettingSchema = z.object({
  isPublic: z
    .boolean({
      required_error: 'isPublic is required.',
      invalid_type_error: 'isPublic must be a boolean.',
    })
    .default(false),

  allowBranching: z
    .boolean({
      required_error: 'allowBranching is required.',
      invalid_type_error: 'allowBranching must be a boolean.',
    })
    .default(false),

  requireApproval: z
    .boolean({
      required_error: 'requireApproval is required.',
      invalid_type_error: 'requireApproval must be a boolean.',
    })
    .default(true),

  allowComments: z
    .boolean({
      required_error: 'allowComments is required.',
      invalid_type_error: 'allowComments must be a boolean.',
    })
    .default(false),

  allowVoting: z
    .boolean({
      required_error: 'allowVoting is required.',
      invalid_type_error: 'allowVoting must be a boolean.',
    })
    .default(false),

  genre: GenreEnum.default('OTHER'),

  contentRating: ContentRatingEnum.default('GENERAL'),

  // converImage: z
  //   .object({
  //     url: z
  //       .string()
  //       .url('Invalid URL format')
  //       .refine((url) => cloudinaryUrlRegex.test(url), 'URL must be a valid Cloudinary URL'),
  //     publicId: z.string().min(1, 'publicId is required'),
  //   })
  //   .optional(),

  cardImage: z
    .object({
      url: z
        .string()
        .url('Invalid URL format')
        .refine((url) => cloudinaryUrlRegex.test(url), 'URL must be a valid Cloudinary URL'),
      publicId: z.string().min(1, 'publicId is required'),
    })
    .optional(),
});

const StoryUpdateCoverImageSchema = z.object({
  coverImage: z.object({
    url: z
      .string()
      .url('Invalid URL format')
      .refine((url) => cloudinaryUrlRegex.test(url), 'URL must be a valid Cloudinary URL'),
    publicId: z.string().min(1, 'publicId is required'),
  }),
});

const StoryUpdateCardImageSchema = z.object({
  cardImage: z.object({
    url: z
      .string()
      .url('Invalid URL format')
      .refine((url) => cloudinaryUrlRegex.test(url), 'URL must be a valid Cloudinary URL'),
    publicId: z.string().min(1, 'publicId is required'),
  }),
});

// Type export
export type TStorySettings = z.infer<typeof StoryUpdateSettingSchema>;

type TStoryIDSchema = z.infer<typeof StoryIdSchema>;
type TStorySlugSchema = z.infer<typeof StorySlugSchema>;
type TStoryCreateSchema = z.infer<typeof StoryCreateSchema>;
type TStoryUpdateSchema = z.infer<typeof StoryUpdateSchema>;
type TStoryAddChapterSchema = z.infer<typeof StoryAddChapterSchema>;
type TStoryAddChapterBySlugSchema = z.infer<typeof StoryAddChapterBySlugSchema>;
type TStoryUpdateChapterTitleSchema = z.infer<typeof StoryUpdateChapterTitleSchema>;
type TStoryUpdateChapterContentSchema = z.infer<typeof StoryUpdateChapterContentSchema>;
type TStoryCreateInviteLinkSchema = z.infer<typeof StoryCreateInviteLinkSchema>;
type TStoryUpdateSettingSchema = z.infer<typeof StoryUpdateSettingSchema>;
type TStoryUpdateCoverImageSchema = z.infer<typeof StoryUpdateCoverImageSchema>;
type TStoryUpdateCardImageSchema = z.infer<typeof StoryUpdateCardImageSchema>;

export {
  StoryIdSchema,
  StorySlugSchema,
  StoryCreateSchema,
  StoryUpdateSchema,
  StoryAddChapterSchema,
  StoryAddChapterBySlugSchema,
  StoryUpdateChapterTitleSchema,
  StoryUpdateChapterContentSchema,
  StoryCreateInviteLinkSchema,
  StoryUpdateSettingSchema,
  StoryUpdateCoverImageSchema,
  StoryUpdateCardImageSchema,
};

export type {
  TStoryIDSchema,
  TStorySlugSchema,
  TStoryCreateSchema,
  TStoryUpdateSchema,
  TStoryAddChapterSchema,
  TStoryAddChapterBySlugSchema,
  TStoryUpdateChapterTitleSchema,
  TStoryUpdateChapterContentSchema,
  TStoryCreateInviteLinkSchema,
  TStoryUpdateSettingSchema,
  TStoryUpdateCoverImageSchema,
  TStoryUpdateCardImageSchema,
};
