import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { Vote } from '@/models/vote.model';
import { IVote, IVoteDoc } from '@/features/vote/types/vote.types';
import { IOperationOptions } from '@/types';
import { FilterQuery } from 'mongoose';

interface IVoteCounts {
  upvotes: number;
  downvotes: number;
  score: number;
}

@singleton()
export class VoteRepository extends BaseRepository<IVote, IVoteDoc> {
  constructor() {
    super(Vote);
  }

  /**
   * Upsert a vote — creates if not exists, updates vote direction if it does.
   * Returns the previous vote document (null if new).
   */
  async upsertVote(
    filter: FilterQuery<IVoteDoc>,
    voteValue: 1 | -1,
    options: IOperationOptions = {}
  ): Promise<{ previous: IVote | null; current: IVote }> {
    // First, find the existing vote (if any)
    const previous = await this.findOne({ filter, options });

    // Upsert the vote
    const current = await this.findOneAndUpdate({
      filter,
      update: { $set: { vote: voteValue } },
      options: { upsert: true, new: true, session: options.session },
    });

    return { previous, current: current! };
  }

  /**
   * Delete a vote and return the deleted document.
   */
  async deleteVote(
    filter: FilterQuery<IVoteDoc>,
    options: IOperationOptions = {}
  ): Promise<IVote | null> {
    return this.findOneAndDelete({ filter, options });
  }

  /**
   * Aggregate vote counts for a given entity (chapter or story).
   * Always queries the Vote collection as the source of truth.
   */
  async aggregateVoteCounts(
    filter: FilterQuery<IVoteDoc>,
    options: IOperationOptions = {}
  ): Promise<IVoteCounts> {
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          upvotes: { $sum: { $cond: [{ $eq: ['$vote', 1] }, 1, 0] } },
          downvotes: { $sum: { $cond: [{ $eq: ['$vote', -1] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          upvotes: 1,
          downvotes: 1,
          score: { $subtract: ['$upvotes', '$downvotes'] },
        },
      },
    ];

    const results = await this.model
      .aggregate<IVoteCounts>(pipeline)
      .session(options.session ?? null)
      .exec();

    return results[0] ?? { upvotes: 0, downvotes: 0, score: 0 };
  }

  /**
   * Find the current user's vote for a given entity.
   */
  async findUserVote(
    filter: FilterQuery<IVoteDoc>,
    options: IOperationOptions = {}
  ): Promise<IVote | null> {
    return this.findOne({ filter, options });
  }
}

export type { IVoteCounts };
