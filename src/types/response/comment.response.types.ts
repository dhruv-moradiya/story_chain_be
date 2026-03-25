import { IComment } from '@/features/comment/types/comment.types';

export interface ICommentResponse extends IComment {
  author: {
    clerkId: string;
    username: string;
    avatarUrl: string;
  };
  currentUserVote: 'upvote' | 'downvote' | null;
}

export interface ICommentPaginatedResponse {
  docs: ICommentResponse[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}
