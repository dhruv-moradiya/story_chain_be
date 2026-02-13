import z from 'zod';

const RecordHeartBeatSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  duration: z
    .number()
    .min(1, 'Duration is required')
    .max(60, 'Duration cannot be more than 60 seconds'),
});

const StartSessionSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

const RecordSessionSchema = z.object({
  storySlug: z.string().min(1, 'Story slug is required'),
  chapterSlug: z.string().min(1, 'Chapter slug is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  duration: z
    .number()
    .min(1, 'Duration is required')
    .max(30, 'Duration cannot be more than 60 seconds'),
});

type TRecordHeartBeatSchema = z.infer<typeof RecordHeartBeatSchema>;
type TStartSessionSchema = z.infer<typeof StartSessionSchema>;
type TRecordSessionSchema = z.infer<typeof RecordSessionSchema>;

export { RecordHeartBeatSchema, StartSessionSchema, RecordSessionSchema };

export type { TRecordHeartBeatSchema, TStartSessionSchema, TRecordSessionSchema };
