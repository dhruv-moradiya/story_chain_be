import { singleton } from 'tsyringe';
import { CommentVote } from '@/models/commentVote.model';
import {
  ICommentVote,
  ICommentVoteCounts,
  ICommentVoteDoc,
  TCommentVoteType,
} from '../types/commentVote.types';
import { BaseRepository } from '@/utils/baseClass';
import { CommentVoteType } from '../types/commentVote-enum';
import { Types } from 'mongoose';

@singleton()
export class CommentVoteRepository extends BaseRepository<ICommentVote, ICommentVoteDoc> {
  constructor() {
    super(CommentVote);
  }

  /**
   * Upserts a vote for a comment.
   * @param commentId - The ID of the comment.
   * @param userId - The ID of the user.
   * @param voteType - The type of vote (upvote or downvote).
   * @returns The upserted vote.
   */
  async upsertVote(commentId: string, userId: string, voteType: TCommentVoteType) {
    return this.model
      .findOneAndUpdate({ commentId, userId }, { $set: { voteType } }, { upsert: true, new: true })
      .lean();
  }

  /**
   * Gets a vote for a comment.
   * @param commentId - The ID of the comment.
   * @param userId - The ID of the user.
   * @returns The vote.
   */
  async getVote(commentId: string, userId: string) {
    return this.model.findOne({ commentId, userId }).lean();
  }

  /**
   * Gets the vote counts for a comment.
   * @param commentId - The ID of the comment.
   * @returns The vote counts.
   */
  async getVoteCounts(commentId: string) {
    return this.model.aggregate([
      { $match: { commentId } },
      { $group: { _id: '$voteType', count: { $sum: 1 } } },
    ]);
  }

  /**
   * Gets the distinct comment IDs.
   * @returns The distinct comment IDs.
   */
  async getDistinctCommentIds() {
    return this.model.distinct('commentId');
  }

  async getCommentVoteCounts(commentId: string): Promise<ICommentVoteCounts> {
    const results = await this.model.aggregate([
      { $match: { commentId: new Types.ObjectId(commentId) } },
      {
        $group: {
          _id: '$voteType',
          count: { $sum: 1 },
        },
      },
    ]);
    const counts: ICommentVoteCounts = { up: 0, down: 0 };
    for (const r of results) {
      if (r._id === CommentVoteType.UPVOTE) counts.up = r.count;
      if (r._id === CommentVoteType.DOWNVOTE) counts.down = r.count;
    }
    return counts;
  }
}
