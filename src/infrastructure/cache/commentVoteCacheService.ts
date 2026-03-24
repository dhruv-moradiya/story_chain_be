import { TOKENS } from '@/container';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { CacheService } from './cache.service';
import { CacheKeyBuilder, TIME } from '.';
import { TCommentVoteType } from '@/features/commentVote/types/commentVote.types';
import { CommentVoteType } from '@/features/commentVote/types/commentVote-enum';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';

@singleton()
export class CommentVoteCacheService extends BaseModule {
  constructor(
    @inject(TOKENS.CacheService) private readonly cacheService: CacheService,

    @inject(TOKENS.CommentVoteRepository)
    private readonly commentVoteRepository: CommentVoteRepository
  ) {
    super();
  }

  // private async setJson<T>(key: string, data: T, ttl: number) {
  //   await this.cacheService.set(key, JSON.stringify(data), { ttl });
  // }

  // private async getJson<T>(key: string): Promise<T | null> {
  //   const data = await this.cacheService.get<string>(key);
  //   return data ? JSON.parse(data) : null;
  // }

  private voterEntry(userId: string, vote: TCommentVoteType): string {
    return `${userId}:${vote}`;
  }

  /**
   * Get the vote type for a user on a comment
   * @param userId - User ID
   * @param commentId - Comment ID
   * @returns Vote type or null if not voted
   */
  async getUserCommentVote(userId: string, commentId: string) {
    const votersKey = CacheKeyBuilder.commentVoters(commentId);

    for (const vote of Object.values(CommentVoteType)) {
      const voterEntry = this.voterEntry(userId, vote);
      const isMember = await this.cacheService.client.sismember(votersKey, voterEntry);
      if (isMember) return vote;
    }
    return null;
  }

  async castVote(commentId: string, userId: string, newVote: TCommentVoteType) {
    const previousVote = await this.getUserCommentVote(userId, commentId);

    if (previousVote === newVote) {
      // Idempotent — same vote already exists, nothing to do
      return { previousVote };
    }

    const pipeline = this.cacheService.client.pipeline();

    if (previousVote) {
      pipeline.srem(
        CacheKeyBuilder.commentVoters(commentId),
        this.voterEntry(userId, previousVote)
      );
    }

    pipeline.sadd(CacheKeyBuilder.commentVoters(commentId), this.voterEntry(userId, newVote));

    await pipeline.exec();

    return { previousVote };
  }

  async getCommentVoteCounts(commentId: string) {
    const votersKey = CacheKeyBuilder.commentVoters(commentId);
    const members = await this.cacheService.client.smembers(votersKey);
    const counts = {
      upvote: 0,
      downvote: 0,
    };
    for (const member of members) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_userId, vote] = member.split(':');
      if (vote === 'upvote') {
        counts.upvote++;
      } else if (vote === 'downvote') {
        counts.downvote++;
      }
    }
    return counts;
  }

  async syncVoteCounts() {
    const commentIds = await this.commentVoteRepository.getDistinctCommentIds();

    const BATCH_SIZE = 100;
    for (let i = 0; i <= commentIds.length; i += BATCH_SIZE) {
      const batch = commentIds.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (commentId) => {
          const counts = await this.commentVoteRepository.getCommentVoteCounts(String(commentId));

          const pipeline = this.cacheService.client.pipeline();
          pipeline.hset(CacheKeyBuilder.commentVotes(String(commentId)), counts);
          pipeline.expire(CacheKeyBuilder.commentVotes(String(commentId)), TIME.WEEK);
          await pipeline.exec();
        })
      );
    }
  }
}
