import { ICommentVoteDoc } from '../../types/commentVote.types';

export interface ICommentVoteService {
  vote(
    userId: string,
    commentId: string,
    voteType: 'upvote' | 'downvote' | 'remove'
  ): Promise<ICommentVoteDoc>;
  getVote(userId: string, commentId: string): Promise<ICommentVoteDoc | null>;
}
