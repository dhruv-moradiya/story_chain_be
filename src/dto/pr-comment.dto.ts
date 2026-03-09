import { PRCommentType } from '@/features/prComment/types/prComment.types';

interface ICreatePrCommentDTO {
  userId: string;
  pullRequestId: string;
  commentType: PRCommentType;
  content: string;
  suggestion?: {
    line?: number;
    originalText: string;
    suggestedText: string;
  };
  parentCommentId?: string;
}

export type { ICreatePrCommentDTO };
