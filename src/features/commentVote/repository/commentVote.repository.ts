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
import { IOperationOptions } from '@/types';

@singleton()
export class CommentVoteRepository extends BaseRepository<ICommentVote, ICommentVoteDoc> {
  constructor() {
    super(CommentVote);
  }

  async countUpvotes(commentId: string) {
    return this.model.countDocuments({
      commentId: new Types.ObjectId(commentId),
      voteType: CommentVoteType.UPVOTE,
    });
  }

  async countDownvotes(commentId: string) {
    return this.model.countDocuments({
      commentId: new Types.ObjectId(commentId),
      voteType: CommentVoteType.DOWNVOTE,
    });
  }

  async upsertVote(
    commentId: string,
    userId: string,
    voteType: TCommentVoteType,
    options: IOperationOptions = {}
  ) {
    return this.model
      .findOneAndUpdate(
        { commentId, userId },
        { $set: { voteType } },
        { upsert: true, new: false, session: options.session }
      ) // return old vote
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

  async getAllCommentVoteCounts() {
    return this.model.aggregate([
      {
        $group: {
          _id: '$commentId',
          up: { $sum: { $cond: [{ $eq: ['$voteType', CommentVoteType.UPVOTE] }, 1, 0] } },
          down: { $sum: { $cond: [{ $eq: ['$voteType', CommentVoteType.DOWNVOTE] }, 1, 0] } },
        },
      },
    ]);
  }

  /**
   * Removes a vote for a comment.
   * @param commentId - The ID of the comment.
   * @param userId - The ID of the user.
   * @param filter - Extra filter conditions like _id or version.
   * @param options - Extra operation options like session.
   * @returns The deleted vote.
   */
  async removeVote(
    commentId: string,
    userId: string,
    filter: { _id?: string | Types.ObjectId; version?: number } = {},
    options: IOperationOptions = {}
  ) {
    return this.model
      .findOneAndDelete({ commentId, userId, ...filter }, { session: options.session })
      .lean();
  }
}
