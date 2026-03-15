import { IChapter } from '@/features/chapter/types/chapter.types';
import { IUser } from '@/features/user/types/user.types';

export interface IChapterWithStoryResponse extends Omit<
  IChapter,
  'authorId' | 'pullRequest' | 'stats'
> {
  storyTitle: string;
  author: Pick<IUser, 'clerkId' | 'username' | 'avatarUrl'>;
  pullRequest: Partial<IChapter['pullRequest']>;
  stats: Partial<IChapter['stats']>;
}

export interface IChapterDetailsResponse extends IChapter {
  author: Pick<IUser, 'clerkId' | 'username' | 'avatarUrl' | 'email'>;
  previousChapters: Array<{ title: string; slug: string }>;
  nextChapters: Array<{ title: string; slug: string }>;
}
