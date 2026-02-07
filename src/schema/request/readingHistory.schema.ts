import z from 'zod';

const RecordHeartBeatSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  duration: z
    .number()
    .min(1, 'Duration is required')
    .max(60, 'Duration cannot be more than 60 seconds'),
});

type TRecordHeartBeatSchema = z.infer<typeof RecordHeartBeatSchema>;

export { RecordHeartBeatSchema };

export type { TRecordHeartBeatSchema };
