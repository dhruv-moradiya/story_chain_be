import { z } from 'zod';
import { ObjectIdSchema } from '../utils';

const UserIdSchema = z.string({
  required_error: 'userId is required.',
  invalid_type_error: 'userId must be a string.',
});

const StorySlugSchema = z.string({
  required_error: 'storySlug is required.',
  invalid_type_error: 'storySlug must be a string.',
});

const ParentChapterIdSchema = ObjectIdSchema().optional();
const ChapterIdSchema = ObjectIdSchema().optional();
const AutoSaveIdSchema = ObjectIdSchema().optional();

const SaveTypeSchema = z.enum(['update', 'new_chapter', 'root_chapter'], {
  required_error: 'autoSaveType is required.',
  invalid_type_error: 'autoSaveType must be: update | new_chapter | root_chapter.',
});

const BaseAutoSaveContentSchema = z.object({
  userId: UserIdSchema,
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
  parentChapterId: z.string({
    required_error: 'parentChapterId is required for new chapter.',
  }),
  autoSaveId: AutoSaveIdSchema,
});

const UpdateAutoSaveSchema = BaseAutoSaveContentSchema.extend({
  autoSaveType: z.literal('update'),
  storySlug: StorySlugSchema,
  chapterId: z.string({
    required_error: 'chapterId is required for update.',
  }),
  parentChapterId: ParentChapterIdSchema,
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
    chapterId: ChapterIdSchema,
    draftId: z.string().optional(),
    autoSaveType: SaveTypeSchema,
    storySlug: StorySlugSchema,
    parentChapterId: ParentChapterIdSchema,
    autoSaveId: AutoSaveIdSchema,
  })
  .refine((data) => data.chapterId || data.draftId || data.autoSaveId, {
    message: 'Either chapterId, draftId, or autoSaveId must be provided.',
    path: ['chapterId'],
  })
  .refine(
    (data) => {
      if (data.autoSaveType === 'update') {
        return data.chapterId && data.storySlug;
      }
      if (data.autoSaveType === 'root_chapter') {
        return data.storySlug;
      }
      if (data.autoSaveType === 'new_chapter') {
        return data.parentChapterId && data.storySlug;
      }
      return false;
    },
    {
      message:
        'For update: chapterId & storySlug required. For root_chapter: storySlug required. For new_chapter: parentChapterId & storySlug required.',
      path: ['autoSaveType'],
    }
  );

const DisableAutoSaveSchema = z
  .object({
    userId: UserIdSchema,
    chapterId: ChapterIdSchema,
    draftId: z.string().optional(),
    autoSaveType: SaveTypeSchema,
    storySlug: StorySlugSchema,
    parentChapterId: ParentChapterIdSchema,
    autoSaveId: AutoSaveIdSchema,
  })
  .refine((data) => data.chapterId || data.draftId || data.autoSaveId, {
    message: 'Either chapterId, draftId, or autoSaveId must be provided.',
    path: ['chapterId'],
  });

type TEnableAutoSaveSchema = z.infer<typeof EnableAutoSaveSchema>;
type TAutoSaveContentSchema = z.infer<typeof AutoSaveContentSchema>;
type TDisableAutoSaveSchema = z.infer<typeof DisableAutoSaveSchema>;

export { EnableAutoSaveSchema, AutoSaveContentSchema, DisableAutoSaveSchema };

export type { TEnableAutoSaveSchema, TAutoSaveContentSchema, TDisableAutoSaveSchema };
