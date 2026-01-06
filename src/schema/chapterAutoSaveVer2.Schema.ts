import { z } from 'zod';
import { ObjectIdSchema } from '../utils';

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

// Note: .passthrough() is required to prevent AJV from stripping properties
// when validating anyOf schemas with removeAdditional: true
const EnableAutoSaveSchemaVer2RootChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  storySlug: z.string(),
}).passthrough();

const EnableAutoSaveSchemaVer2NewChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('new_chapter'),
  storySlug: z.string(),
  parentChapterId: z.string(),
}).passthrough();

const EnableAutoSaveSchemaVer2UpdateChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('update_chapter'),
  storySlug: z.string(),
  chapterId: z.string(),
  parentChapterId: z.string(),
}).passthrough();

const AutoSaveContentSchemaVer2RootChapter = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  autoSaveId: ObjectIdSchema().optional(),
  storySlug: z.string(),
}).passthrough();

const AutoSaveContentSchemaVer2NewChapter = BaseAutoSaveContentSchema.extend({
  autoSaveId: ObjectIdSchema().optional(),
  autoSaveType: z.literal('new_chapter'),
  storySlug: z.string(),
  parentChapterId: ObjectIdSchema(),
}).passthrough();

const AutoSaveContentSchemaVer2UpdateChapter = BaseAutoSaveContentSchema.extend({
  autoSaveId: ObjectIdSchema().optional(),
  autoSaveType: z.literal('update_chapter'),
  storySlug: z.string(),
  parentChapterId: ObjectIdSchema(),
  chapterId: ObjectIdSchema(),
}).passthrough();

const AutoSaveContentSchemaVer2DisableAutoSave = z.object({
  autoSaveId: ObjectIdSchema(),
});

const AutoSaveContentSchemaVer2PublishChapter = z.object({
  autoSaveId: ObjectIdSchema(),
});

const EnableAutoSaveSchemaVer2 = z.discriminatedUnion('autoSaveType', [
  EnableAutoSaveSchemaVer2RootChapter,
  EnableAutoSaveSchemaVer2NewChapter,
  EnableAutoSaveSchemaVer2UpdateChapter,
]);

const AutoSaveContentSchemaVer2 = z.discriminatedUnion('autoSaveType', [
  AutoSaveContentSchemaVer2RootChapter,
  AutoSaveContentSchemaVer2NewChapter,
  AutoSaveContentSchemaVer2UpdateChapter,
]);

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

// PUBLISH AUTO SAVE
type TAutoSaveContentSchemaVer2PublishChapter = z.infer<
  typeof AutoSaveContentSchemaVer2PublishChapter
>;

export {
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
  AutoSaveContentSchemaVer2PublishChapter,
};

export type {
  TEnableAutoSaveSchemaVer2Type,
  TEnableAutoSaveSchemaVer2RootChapter,
  TEnableAutoSaveSchemaVer2NewChapter,
  TEnableAutoSaveSchemaVer2UpdateChapter,
  TAutoSaveContentSchemaVer2,
  TAutoSaveContentSchemaVer2RootChapter,
  TAutoSaveContentSchemaVer2NewChapter,
  TAutoSaveContentSchemaVer2UpdateChapter,
  TAutoSaveContentSchemaVer2DisableAutoSave,
  TAutoSaveContentSchemaVer2PublishChapter,
};
