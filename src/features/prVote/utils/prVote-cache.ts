import { IPullRequest } from '@/features/pullRequest/types/pullRequest.types';
import { CACHE_TTL, CacheKeyBuilder } from '@/infrastructure';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { ICurrentUserPRVote, TPRVoteValue } from '../types/prVote.types';

interface ICachedPRVoteMetadata {
  pullRequestId: string;
  storySlug: string;
  authorId: string;
  status: IPullRequest['status'];
}

interface ICachedPRVoteStats {
  upvotes: number;
  downvotes: number;
  score: number;
  totalVotes: number;
}

function buildCachedPRVoteMetadata(
  pullRequest: Pick<IPullRequest, '_id' | 'storySlug' | 'authorId' | 'status'>
): ICachedPRVoteMetadata {
  return {
    pullRequestId: String(pullRequest._id),
    storySlug: pullRequest.storySlug,
    authorId: pullRequest.authorId,
    status: pullRequest.status,
  };
}

function buildCachedPRVoteStats(
  upvotes: number,
  downvotes: number,
  score: number
): ICachedPRVoteStats {
  return {
    upvotes,
    downvotes,
    score,
    totalVotes: upvotes + downvotes,
  };
}

function buildPRVoteStatsFromPullRequest(
  pullRequest: Pick<IPullRequest, 'votes'>
): ICachedPRVoteStats {
  return buildCachedPRVoteStats(
    pullRequest.votes.upvotes,
    pullRequest.votes.downvotes,
    pullRequest.votes.score
  );
}

async function cachePRVoteMetadata(
  cacheService: CacheService,
  pullRequest: Pick<IPullRequest, '_id' | 'storySlug' | 'authorId' | 'status'>
): Promise<ICachedPRVoteMetadata> {
  const metadata = buildCachedPRVoteMetadata(pullRequest);

  await cacheService.set(CacheKeyBuilder.pullRequestMetadata(metadata.pullRequestId), metadata, {
    ttl: CACHE_TTL.PULL_REQUEST_METADATA,
  });

  return metadata;
}

async function cachePRVoteSummary(
  cacheService: CacheService,
  pullRequestId: string,
  voteStats: ICachedPRVoteStats
): Promise<void> {
  await cacheService.set(CacheKeyBuilder.pullRequestVoteSummary(pullRequestId), voteStats, {
    ttl: CACHE_TTL.PULL_REQUEST_VOTE_SUMMARY,
  });
}

async function cachePRUserVote(
  cacheService: CacheService,
  pullRequestId: string,
  userId: string,
  vote: TPRVoteValue | null
): Promise<ICurrentUserPRVote> {
  const payload: ICurrentUserPRVote = {
    pullRequestId,
    vote,
  };

  await cacheService.set(CacheKeyBuilder.pullRequestUserVote(pullRequestId, userId), payload, {
    ttl: CACHE_TTL.PULL_REQUEST_USER_VOTE,
  });

  return payload;
}

export type { ICachedPRVoteMetadata, ICachedPRVoteStats };
export {
  buildCachedPRVoteMetadata,
  buildCachedPRVoteStats,
  buildPRVoteStatsFromPullRequest,
  cachePRUserVote,
  cachePRVoteMetadata,
  cachePRVoteSummary,
};
