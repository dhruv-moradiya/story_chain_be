import { z } from 'zod';
import { ObjectIdSchema } from '@utils/index';

const AutoSaveIdSchema = ObjectIdSchema().optional();

const BaseAutoSaveContentSchema = z.object({
  // userId: UserIdSchema,
  title: z
    .string({
      required_error: 'title is required.',
      invalid_type_error: 'title must be a string.',
    })
    .max(200),

  content: z
    .string({
      required_error: 'content is required.',
      invalid_type_error: 'content must be a string.',
    })
    .max(10000000),
});

const GetAutoSaveDraftQuerySchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
});

// Note: .passthrough() is required to prevent AJV from stripping properties
// when validating anyOf schemas with removeAdditional: true
const EnableAutoSaveSchemaVer2RootChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  storySlug: z.string(),
}).passthrough();

const EnableAutoSaveSchemaVer2NewChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('new_chapter'),
  storySlug: z.string(),
  parentChapterSlug: z.string(),
}).passthrough();

const EnableAutoSaveSchemaVer2UpdateChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('update_chapter'),
  storySlug: z.string(),
  chapterSlug: z.string(),
  parentChapterSlug: z.string(),
}).passthrough();

// When autoSaveId is provided, storySlug is optional
const AutoSaveContentSchemaVer2RootChapterWithId = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  autoSaveId: ObjectIdSchema(),
  storySlug: z.string().optional(),
}).passthrough();

// When autoSaveId is not provided, storySlug is required
const AutoSaveContentSchemaVer2RootChapterWithSlug = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  autoSaveId: z.undefined().optional(),
  storySlug: z.string(),
}).passthrough();

const AutoSaveContentSchemaVer2RootChapter = z.union([
  AutoSaveContentSchemaVer2RootChapterWithId,
  AutoSaveContentSchemaVer2RootChapterWithSlug,
]);

const AutoSaveContentSchemaVer2NewChapter = BaseAutoSaveContentSchema.extend({
  autoSaveId: ObjectIdSchema().optional(),
  autoSaveType: z.literal('new_chapter'),
  storySlug: z.string(),
  parentChapterSlug: z.string(),
}).passthrough();

const AutoSaveContentSchemaVer2UpdateChapter = BaseAutoSaveContentSchema.extend({
  autoSaveId: ObjectIdSchema().optional(),
  autoSaveType: z.literal('update_chapter'),
  storySlug: z.string(),
  parentChapterSlug: z.string(),
  chapterSlug: z.string(),
}).passthrough();

const AutoSaveContentSchemaVer2DisableAutoSave = z.object({
  autoSaveId: ObjectIdSchema(),
});

/**
 * Convert AutoSave
 * - type: 'draft' (user draft) or 'publish' (published chapter)
 */
const ConvertAutoSaveQuerySchema = z.object({
  type: z.enum(['draft', 'publish'], {
    required_error: 'type is required (draft or publish)',
  }),
});

const ConvertAutoSaveSchema = z.object({
  autoSaveId: ObjectIdSchema(),
});

const EnableAutoSaveSchemaVer2 = z.discriminatedUnion('autoSaveType', [
  EnableAutoSaveSchemaVer2RootChapter,
  EnableAutoSaveSchemaVer2NewChapter,
  EnableAutoSaveSchemaVer2UpdateChapter,
]);

const AutoSaveContentSchemaVer2 = z.union([
  AutoSaveContentSchemaVer2RootChapter,
  AutoSaveContentSchemaVer2NewChapter,
  AutoSaveContentSchemaVer2UpdateChapter,
]);

type TAutoSaveIdSchema = z.infer<typeof AutoSaveIdSchema>;

type TGetAutoSaveDraftQuerySchema = z.infer<typeof GetAutoSaveDraftQuerySchema>;

// ENABLE AUTO SAVE
type TEnableAutoSaveSchemaVer2RootChapter = z.infer<typeof EnableAutoSaveSchemaVer2RootChapter>;
type TEnableAutoSaveSchemaVer2NewChapter = z.infer<typeof EnableAutoSaveSchemaVer2NewChapter>;
type TEnableAutoSaveSchemaVer2UpdateChapter = z.infer<typeof EnableAutoSaveSchemaVer2UpdateChapter>;
type TEnableAutoSaveSchemaVer2Type = z.infer<typeof EnableAutoSaveSchemaVer2>;

// AUTO SAVE CONTENT
type TAutoSaveContentSchemaVer2RootChapter = z.infer<typeof AutoSaveContentSchemaVer2RootChapter>;
type TAutoSaveContentSchemaVer2NewChapter = z.infer<typeof AutoSaveContentSchemaVer2NewChapter>;
type TAutoSaveContentSchemaVer2UpdateChapter = z.infer<
  typeof AutoSaveContentSchemaVer2UpdateChapter
>;
type TAutoSaveContentSchemaVer2 = z.infer<typeof AutoSaveContentSchemaVer2>;

// DISABLE AUTO SAVE
type TAutoSaveContentSchemaVer2DisableAutoSave = z.infer<
  typeof AutoSaveContentSchemaVer2DisableAutoSave
>;

// CONVERT
type TConvertAutoSaveQuerySchema = z.infer<typeof ConvertAutoSaveQuerySchema>;
type TConvertAutoSaveSchema = z.infer<typeof ConvertAutoSaveSchema>;

export {
  AutoSaveIdSchema,
  GetAutoSaveDraftQuerySchema,
  BaseAutoSaveContentSchema,
  EnableAutoSaveSchemaVer2,
  EnableAutoSaveSchemaVer2NewChapter,
  EnableAutoSaveSchemaVer2RootChapter,
  EnableAutoSaveSchemaVer2UpdateChapter,
  AutoSaveContentSchemaVer2,
  AutoSaveContentSchemaVer2RootChapter,
  AutoSaveContentSchemaVer2NewChapter,
  AutoSaveContentSchemaVer2UpdateChapter,
  AutoSaveContentSchemaVer2DisableAutoSave,
  ConvertAutoSaveQuerySchema,
  ConvertAutoSaveSchema,
};

export type {
  TAutoSaveIdSchema,
  TGetAutoSaveDraftQuerySchema,
  TEnableAutoSaveSchemaVer2Type,
  TEnableAutoSaveSchemaVer2RootChapter,
  TEnableAutoSaveSchemaVer2NewChapter,
  TEnableAutoSaveSchemaVer2UpdateChapter,
  TAutoSaveContentSchemaVer2,
  TAutoSaveContentSchemaVer2RootChapter,
  TAutoSaveContentSchemaVer2NewChapter,
  TAutoSaveContentSchemaVer2UpdateChapter,
  TAutoSaveContentSchemaVer2DisableAutoSave,
  TConvertAutoSaveQuerySchema,
  TConvertAutoSaveSchema,
};
