import z from 'zod';
import { ANALYTICS_TYPES } from '@features/readingHistory/types/analytics-enum';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const AnalyticsQuerySchema = z
  .object({
    type: z.enum(ANALYTICS_TYPES, {
      required_error: 'Analytics type is required',
      invalid_type_error: `Invalid analytics type. Must be one of: ${ANALYTICS_TYPES.join(', ')}`,
    }),
    date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
    from: z.string().regex(dateRegex, 'From date must be in YYYY-MM-DD format').optional(),
    to: z.string().regex(dateRegex, 'To date must be in YYYY-MM-DD format').optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'daily') {
        return !!data.from && !!data.to;
      }
      return true;
    },
    {
      message: 'Both "from" and "to" are required when type is "daily"',
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'daily' && data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: '"from" date must be before or equal to "to" date',
      path: ['from'],
    }
  );

const ChapterAnalyticsParamSchema = z.object({
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  storySlug: z.string().min(1, 'Story slug is required'),
});

const StoryAnalyticsParamSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
});

type TAnalyticsQuerySchema = z.infer<typeof AnalyticsQuerySchema>;
type TChapterAnalyticsParamSchema = z.infer<typeof ChapterAnalyticsParamSchema>;
type TStoryAnalyticsParamSchema = z.infer<typeof StoryAnalyticsParamSchema>;

export { AnalyticsQuerySchema, ChapterAnalyticsParamSchema, StoryAnalyticsParamSchema };

export type { TAnalyticsQuerySchema, TChapterAnalyticsParamSchema, TStoryAnalyticsParamSchema };
