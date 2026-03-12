import { toId } from '@/utils';
import { BaseRepository } from '@/utils/baseClass';
import { MongoServerError } from 'mongodb';
import { singleton } from 'tsyringe';
import { PRVote } from '@models/prVote.model';
import {
  ICurrentUserPRVote,
  IPRVote,
  IPRVoteDoc,
  IPRVoteMutationResult,
} from '../types/prVote.types';

@singleton()
class PrVoteRepository extends BaseRepository<IPRVote, IPRVoteDoc> {
  constructor() {
    super(PRVote);
  }

  async findByPullRequestAndUser(pullRequestId: string, userId: string) {
    return this.findOne({ filter: { pullRequestId, userId } });
  }

  async createVote(input: Pick<IPRVote, 'pullRequestId' | 'userId' | 'vote'>) {
    return this.create({ data: input });
  }

  async updateVote(pullRequestId: string, userId: string, vote: IPRVote['vote']) {
    return this.findOneAndUpdate({
      filter: { pullRequestId, userId },
      update: {
        $set: {
          vote,
        },
      },
    });
  }

  async deleteVote(pullRequestId: string, userId: string) {
    return this.findOneAndDelete({ filter: { pullRequestId, userId } });
  }

  async getVoteStats(pullRequestId: string) {
    const [voteStats] = await this.model.aggregate<{
      upvotes: number;
      downvotes: number;
      score: number;
      totalVotes: number;
    }>([
      {
        $match: {
          pullRequestId: toId(pullRequestId),
        },
      },
      {
        $group: {
          _id: '$pullRequestId',
          upvotes: {
            $sum: {
              $cond: [{ $eq: ['$vote', 1] }, 1, 0],
            },
          },
          downvotes: {
            $sum: {
              $cond: [{ $eq: ['$vote', -1] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          upvotes: 1,
          downvotes: 1,
          score: {
            $subtract: ['$upvotes', '$downvotes'],
          },
          totalVotes: {
            $add: ['$upvotes', '$downvotes'],
          },
        },
      },
    ]);

    return (
      voteStats ?? {
        upvotes: 0,
        downvotes: 0,
        score: 0,
        totalVotes: 0,
      }
    );
  }

  async getUserVote(pullRequestId: string, userId: string): Promise<ICurrentUserPRVote> {
    const vote = await this.findByPullRequestAndUser(pullRequestId, userId);

    return {
      pullRequestId,
      vote: vote?.vote ?? null,
    };
  }

  async saveVote(
    pullRequestId: string,
    userId: string,
    vote: IPRVote['vote']
  ): Promise<IPRVoteMutationResult> {
    const existingVote = await this.findByPullRequestAndUser(pullRequestId, userId);

    if (!existingVote) {
      try {
        await this.createVote({ pullRequestId, userId, vote });
        return {
          currentVote: vote,
          previousVote: null,
          changed: true,
        };
      } catch (error: unknown) {
        if (!(error instanceof MongoServerError) || error.code !== 11000) {
          throw error;
        }

        const concurrentVote = await this.findByPullRequestAndUser(pullRequestId, userId);

        if (!concurrentVote) {
          throw error;
        }

        if (concurrentVote.vote === vote) {
          return {
            currentVote: concurrentVote.vote,
            previousVote: concurrentVote.vote,
            changed: false,
          };
        }

        await this.updateVote(pullRequestId, userId, vote);

        return {
          currentVote: vote,
          previousVote: concurrentVote.vote,
          changed: true,
        };
      }
    }

    if (existingVote.vote === vote) {
      return {
        currentVote: existingVote.vote,
        previousVote: existingVote.vote,
        changed: false,
      };
    }

    await this.updateVote(pullRequestId, userId, vote);

    return {
      currentVote: vote,
      previousVote: existingVote.vote,
      changed: true,
    };
  }

  async removeUserVote(pullRequestId: string, userId: string): Promise<IPRVoteMutationResult> {
    const existingVote = await this.findByPullRequestAndUser(pullRequestId, userId);

    if (!existingVote) {
      return {
        currentVote: null,
        previousVote: null,
        changed: false,
      };
    }

    await this.deleteVote(pullRequestId, userId);

    return {
      currentVote: null,
      previousVote: existingVote.vote,
      changed: true,
    };
  }
}

export { PrVoteRepository };
