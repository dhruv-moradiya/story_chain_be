import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TYPES,
  REPORT_ACTIONS_TAKEN,
  ReportStatus,
  ReportType,
} from '@/features/report/types/report-enum';
import { z } from 'zod';
import { ClerkUserIdSchema } from './commonRequest.schema';

const BaseReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
});

// User Endpoints Schemas
export const CreateReportSchema = z.discriminatedUnion('reportType', [
  // CHAPTER
  BaseReportSchema.extend({
    reportType: z.literal(ReportType.CHAPTER),
    relatedChapterSlug: z.string().min(1, 'Chapter slug is required'),
    relatedStorySlug: z.string().min(1, 'Story slug is required'),
  }),

  // COMMENT
  BaseReportSchema.extend({
    reportType: z.literal(ReportType.COMMENT),
    relatedChapterSlug: z.string().min(1, 'Chapter slug is required'),
    relatedStorySlug: z.string().min(1, 'Story slug is required'),
    relatedCommentId: z.string().min(1, 'Comment ID is required'),
  }),

  // USER
  BaseReportSchema.extend({
    reportType: z.literal(ReportType.USER),
    relatedUserId: ClerkUserIdSchema,
  }),

  // STORY
  BaseReportSchema.extend({
    reportType: z.literal(ReportType.STORY),
    relatedStorySlug: z.string().min(1, 'Story slug is required'),
  }),
]);

export const PaginatedReportQueryParamsSchema = z.object({
  report_type: z.enum(REPORT_TYPES).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const ReportIdParamsSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
});

// Story-Level Moderation Endpoints Schemas
export const StorySlugParamsSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
});

export const StoryReportParamsSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  reportId: z.string().min(1, 'Report ID is required'),
});

export const ResolveStoryReportSchema = z.object({
  status: z.enum([ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
  resolution: z.string().trim().min(1, 'Resolution is required').max(1000),
  actionTaken: z.enum(REPORT_ACTIONS_TAKEN).optional(),
});

export const BanUserFromStorySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
});

export const StoryUserBanParamsSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  userId: z.string().min(1, 'User ID is required'),
});

// Marks a report as being actively reviewed (PENDING → UNDER_REVIEW) or dismisses it.
export const UpdateReportStatusSchema = z.object({
  status: z.enum([ReportStatus.UNDER_REVIEW, ReportStatus.DISMISSED]),
});

export const PlatformResolveReportSchema = z.object({
  resolution: z.string().trim().min(1, 'Resolution is required').max(1000),
  globalAction: z.enum(REPORT_ACTIONS_TAKEN).optional(),
});

export const PlatformBanUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
  durationDays: z.number().min(1).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
});

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type TCreateReportInput = z.infer<typeof CreateReportSchema>;
export type TPaginatedReportQueryParamsInput = z.infer<typeof PaginatedReportQueryParamsSchema>;
export type TReportIdParamsInput = z.infer<typeof ReportIdParamsSchema>;
export type TStorySlugParamsInput = z.infer<typeof StorySlugParamsSchema>;
export type TStoryReportParamsInput = z.infer<typeof StoryReportParamsSchema>;
export type TResolveStoryReportInput = z.infer<typeof ResolveStoryReportSchema>;
export type TBanUserFromStoryInput = z.infer<typeof BanUserFromStorySchema>;
export type TStoryUserBanParamsInput = z.infer<typeof StoryUserBanParamsSchema>;
export type TUpdateReportStatusInput = z.infer<typeof UpdateReportStatusSchema>;
export type TPlatformResolveReportInput = z.infer<typeof PlatformResolveReportSchema>;
export type TPlatformBanUserInput = z.infer<typeof PlatformBanUserSchema>;
export type TUserIdParamsInput = z.infer<typeof UserIdParamsSchema>;
