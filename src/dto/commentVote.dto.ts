import { TCommentVoteType } from '@/features/commentVote/types/commentVote.types';

interface ICommentVoteDTO {
  userId: string;
  commentId: string;
  voteType: TCommentVoteType;
}

export type { ICommentVoteDTO };
