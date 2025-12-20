import { z } from 'zod';
import { ObjectIdSchema } from '../utils';

const UserIdSchema = z.string({
  required_error: 'userId is required.',
  invalid_type_error: 'userId must be a string.',
});

const DraftIdSchema = z.string({
  invalid_type_error: 'draftId must be a string.',
});

const EnableAutoSaveSchema = z
  .object({
    userId: UserIdSchema,
    chapterId: ObjectIdSchema().optional(),
    draftId: DraftIdSchema.optional(),
  })
  .refine((data) => data.chapterId || data.draftId, {
    message: 'Either chapterId or draftId must be provided.',
    path: ['chapterId'],
  });

const AutoSaveContentSchema = z
  .object({
    userId: UserIdSchema,
    chapterId: ObjectIdSchema().optional(),
    draftId: DraftIdSchema.optional(),
    title: z.string({
      required_error: 'title is required.',
      invalid_type_error: 'title must be a string.',
    }),
    content: z.string({
      required_error: 'content is required.',
      invalid_type_error: 'content must be a string.',
    }),
  })
  .refine((data) => data.chapterId || data.draftId, {
    message: 'Either chapterId or draftId must be provided.',
    path: ['chapterId'],
  });

const DisableAutoSaveSchema = z
  .object({
    userId: UserIdSchema,
    chapterId: ObjectIdSchema().optional(),
    draftId: DraftIdSchema.optional(),
  })
  .refine((data) => data.chapterId || data.draftId, {
    message: 'Either chapterId or draftId must be provided.',
    path: ['chapterId'],
  });

type TEnableAutoSaveSchema = z.infer<typeof EnableAutoSaveSchema>;
type TAutoSaveContentSchema = z.infer<typeof AutoSaveContentSchema>;
type TDisableAutoSaveSchema = z.infer<typeof DisableAutoSaveSchema>;

export { EnableAutoSaveSchema, AutoSaveContentSchema, DisableAutoSaveSchema };

export type { TEnableAutoSaveSchema, TAutoSaveContentSchema, TDisableAutoSaveSchema };
