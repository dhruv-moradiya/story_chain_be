import { z } from 'zod';
import { ObjectIdSchema } from '@utils/index';

const UserIdSchema = z.string({
  required_error: 'userId is required.',
  invalid_type_error: 'userId must be a string.',
});

const StorySlugSchema = z.string({
  required_error: 'storySlug is required.',
  invalid_type_error: 'storySlug must be a string.',
});

const ParentChapterSlugSchema = z.string().optional();
const ChapterSlugSchema = z.string().optional();
const AutoSaveIdSchema = ObjectIdSchema().optional();

const SaveTypeSchema = z.enum(['update_chapter', 'new_chapter', 'root_chapter'], {
  required_error: 'autoSaveType is required.',
  invalid_type_error: 'autoSaveType must be: update | new_chapter | root_chapter.',
});

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

const EnableAutoSaveSchema = z
  .object({
    userId: UserIdSchema,
    chapterSlug: ChapterSlugSchema,
    draftId: z.string().optional(),
    autoSaveType: SaveTypeSchema,
    storySlug: StorySlugSchema,
    parentChapterSlug: ParentChapterSlugSchema,
    autoSaveId: AutoSaveIdSchema,
  })
  .refine((data) => data.chapterSlug || data.draftId || data.autoSaveId, {
    message: 'Either chapterSlug, draftId, or autoSaveId must be provided.',
    path: ['chapterSlug'],
  })
  .refine(
    (data) => {
      if (data.autoSaveType === 'update_chapter') {
        return data.chapterSlug && data.storySlug;
      }
      if (data.autoSaveType === 'root_chapter') {
        return data.storySlug;
      }
      if (data.autoSaveType === 'new_chapter') {
        return data.parentChapterSlug && data.storySlug;
      }
      return false;
    },
    {
      message:
        'For update: chapterSlug & storySlug required. For root_chapter: storySlug required. For new_chapter: parentChapterSlug & storySlug required.',
      path: ['autoSaveType'],
    }
  );

const DisableAutoSaveSchema = z
  .object({
    userId: UserIdSchema,
    chapterSlug: ChapterSlugSchema,
    draftId: z.string().optional(),
    autoSaveType: SaveTypeSchema,
    storySlug: StorySlugSchema,
    parentChapterSlug: ParentChapterSlugSchema,
    autoSaveId: AutoSaveIdSchema,
  })
  .refine((data) => data.chapterSlug || data.draftId || data.autoSaveId, {
    message: 'Either chapterSlug, draftId, or autoSaveId must be provided.',
    path: ['chapterSlug'],
  });

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

type TEnableAutoSaveSchema = z.infer<typeof EnableAutoSaveSchema>;
type TAutoSaveContentSchema = z.infer<typeof AutoSaveContentSchema>;
type TDisableAutoSaveSchema = z.infer<typeof DisableAutoSaveSchema>;
type TPublishAutoSaveDraftSchema = z.infer<typeof PublishAutoSaveDraftSchema>;

export {
  EnableAutoSaveSchema,
  AutoSaveContentSchema,
  DisableAutoSaveSchema,
  PublishAutoSaveDraftSchema,
};

export type {
  TEnableAutoSaveSchema,
  TAutoSaveContentSchema,
  TDisableAutoSaveSchema,
  TPublishAutoSaveDraftSchema,
};
