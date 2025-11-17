import mongoose from 'mongoose';
import { z } from 'zod';

const objectIdString = () =>
  z
    .string()
    .min(1, { message: 'ObjectId is required' })
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid ObjectId',
    });

interface IChapterCreateDTO {
  storyId: string;
  parentChapterId?: string;
  title: string;
  content: string;
  userId: string;
}

export type { IChapterCreateDTO };
