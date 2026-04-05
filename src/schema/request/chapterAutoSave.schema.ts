import { z } from 'zod';
import { ObjectIdSchema } from '@utils/index';

const StorySlugSchema = z.string({
  required_error: 'storySlug is required.',
  invalid_type_error: 'storySlug must be a string.',
});

const ParentChapterSlugSchema = z.string().optional();
const ChapterSlugSchema = z.string().optional();
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

const RootChapterAutoSaveSchema = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('root_chapter'),
  storySlug: StorySlugSchema,
  autoSaveId: AutoSaveIdSchema,
  draftId: z.string().optional(),
});

const NewChapterAutoSaveSchema = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('new_chapter'),
  storySlug: StorySlugSchema,
  parentChapterSlug: z.string({
    required_error: 'parentChapterSlug is required for new chapter.',
  }),
  autoSaveId: AutoSaveIdSchema,
});

const UpdateAutoSaveSchema = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('update_chapter'),
  storySlug: StorySlugSchema,
  chapterSlug: z.string({
    required_error: 'chapterSlug is required for update.',
  }),
  parentChapterSlug: ParentChapterSlugSchema,
  autoSaveId: AutoSaveIdSchema,
});

const AutoSaveContentSchema = z.discriminatedUnion('autoSaveType', [
  RootChapterAutoSaveSchema,
  NewChapterAutoSaveSchema,
  UpdateAutoSaveSchema,
]);

const PublishAutoSaveDraftSchema = z
  .object({
    // userId: UserIdSchema,
    chapterSlug: ChapterSlugSchema,
    draftId: z.string().optional(),
  })
  .refine((data) => data.chapterSlug || data.draftId, {
    message: 'Either chapterSlug or draftId must be provided.',
    path: ['chapterSlug'],
  });

type TAutoSaveContentSchema = z.infer<typeof AutoSaveContentSchema>;
type TPublishAutoSaveDraftSchema = z.infer<typeof PublishAutoSaveDraftSchema>;

export { AutoSaveContentSchema, PublishAutoSaveDraftSchema };

export type { TAutoSaveContentSchema, TPublishAutoSaveDraftSchema };
