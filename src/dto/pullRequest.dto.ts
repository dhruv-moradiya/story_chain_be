import { TPRType } from '@features/pullRequest/types/pullRequest.types';

interface IPullRequestDto {
  userId: string;
  title: string;
  description: string;
  storySlug: string;
  chapterSlug: string;
  parentChapterSlug: string;
  prType: TPRType;
  changes: {
    proposed?: string;
    original?: string;
  };
  isDraft?: boolean;
}

export type { IPullRequestDto };
