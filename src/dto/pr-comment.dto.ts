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

interface IEditPrCommentDTO {
  userId: string;
  commentId: string;
  content: string;
  suggestion?: {
    line?: number;
    originalText: string;
    suggestedText: string;
  };
}

interface IResolvePrCommentDTO {
  userId: string;
  commentId: string;
}

export type { ICreatePrCommentDTO, IEditPrCommentDTO, IResolvePrCommentDTO };
