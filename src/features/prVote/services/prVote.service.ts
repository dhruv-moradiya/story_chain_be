import { TOKENS } from '@/container';
import { ICastPRVoteDTO, IGetPRVoteDTO, IRemovePRVoteDTO } from '@/dto/pr-vote.dto';
import { PullRequestRepository } from '@/features/pullRequest/repositories/pullRequest.repository';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { PRStatus } from '@/features/pullRequest/types/pullRequest-enum';
import { IPullRequest } from '@/features/pullRequest/types/pullRequest.types';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { CacheKeyBuilder } from '@/infrastructure';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrVoteRepository } from '../repositories/pr-vote-repository';
import { ICurrentUserPRVote, IPRVoteSummary, TPRVoteValue } from '../types/prVote.types';
import {
  ICachedPRVoteMetadata,
  buildPRVoteStatsFromPullRequest,
  cachePRUserVote,
  cachePRVoteMetadata,
  cachePRVoteSummary,
} from '../utils/prVote-cache';

@singleton()
class PrVoteService extends BaseModule {
  constructor(
    @inject(TOKENS.CacheService)
    private readonly cacheService: CacheService,
    @inject(TOKENS.PrVoteRepository)
    private readonly prVoteRepository: PrVoteRepository,
    @inject(TOKENS.PullRequestQueryService)
    private readonly pullRequestQueryService: PullRequestQueryService,
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  // ─── Private cache helpers ────────────────────────────────────────────────

  /**
   * Fetches lightweight PR metadata (id, storySlug, authorId, status) from cache.
   * On a miss, fetches the full PR from DB, caches just the metadata fields, and returns them.
   */
  private async getPullRequestMetadata(pullRequestId: string): Promise<ICachedPRVoteMetadata> {
    const cached = await this.cacheService.get<ICachedPRVoteMetadata>(
      CacheKeyBuilder.pullRequestMetadata(pullRequestId)
    );

    if (cached) return cached;

    const pullRequest = await this.pullRequestQueryService.getPullRequestById(pullRequestId);

    return cachePRVoteMetadata(this.cacheService, pullRequest);
  }

  /**
   * Fetches the collaborator role from cache; falls back to DB and caches for 5 min.
   */
  private getCachedCollaboratorRole(userId: string, storySlug: string) {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.collaboratorRole(userId, storySlug),
      () => this.collaboratorQueryService.getCollaboratorRole(userId, storySlug),
      { ttlKey: 'COLLABORATOR_ROLE' }
    );
  }

  /**
   * Fetches the user's cached vote on a PR, falling back to the DB if not found.
   */
  private async getCachedUserVote(
    pullRequestId: string,
    userId: string
  ): Promise<ICurrentUserPRVote> {
    const cached = await this.cacheService.get<ICurrentUserPRVote>(
      CacheKeyBuilder.pullRequestUserVote(pullRequestId, userId)
    );

    if (cached) return cached;

    const userVote = await this.prVoteRepository.getUserVote(pullRequestId, userId);

    return cachePRUserVote(this.cacheService, pullRequestId, userId, userVote.vote);
  }

  // ─── Access guard ─────────────────────────────────────────────────────────

  /**
   * Validates that the user is a collaborator on the story linked to the PR.
   * Uses cached metadata + cached role to avoid DB hits on warm paths.
   */
  private async getAccessiblePullRequest(
    userId: string,
    pullRequestId: string
  ): Promise<ICachedPRVoteMetadata> {
    const pullRequest = await this.getPullRequestMetadata(pullRequestId);

    const userStoryRole = await this.getCachedCollaboratorRole(userId, pullRequest.storySlug);

    if (!userStoryRole) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have access to this pull request vote API.'
      );
    }

    return pullRequest;
  }

  // ─── Business rule guard ──────────────────────────────────────────────────

  private ensureVotingIsAllowed(pullRequest: ICachedPRVoteMetadata) {
    const blockedStatuses = new Set<IPullRequest['status']>([
      PRStatus.CLOSED,
      PRStatus.REJECTED,
      PRStatus.MERGED,
    ]);

    if (blockedStatuses.has(pullRequest.status)) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'Voting is not allowed on this pull request in its current state.'
      );
    }
  }

  // ─── Result builder ───────────────────────────────────────────────────────

  private buildVoteSummary(
    pullRequestId: string,
    voteStats: Omit<IPRVoteSummary, 'pullRequestId' | 'currentUserVote'>,
    currentUserVote: TPRVoteValue | null
  ): IPRVoteSummary {
    return {
      pullRequestId,
      upvotes: voteStats.upvotes,
      downvotes: voteStats.downvotes,
      score: voteStats.score,
      totalVotes: voteStats.totalVotes,
      currentUserVote,
    };
  }

  // ─── Vote stats cache helpers ─────────────────────────────────────────────

  /**
   * Fetches aggregate vote stats from cache; falls back to DB and caches for 2 min.
   */
  private async getCachedVoteStats(pullRequestId: string) {
    const cached = await this.cacheService.get<
      Omit<IPRVoteSummary, 'pullRequestId' | 'currentUserVote'>
    >(CacheKeyBuilder.pullRequestVoteSummary(pullRequestId));

    if (cached) return cached;

    const voteStats = await this.prVoteRepository.getVoteStats(pullRequestId);

    await cachePRVoteSummary(this.cacheService, pullRequestId, voteStats);

    return voteStats;
  }

  /**
   * Invalidates all vote-related cache entries for a PR.
   */
  private invalidateVoteCache(pullRequestId: string, userId?: string): Promise<void> {
    const keys = [CacheKeyBuilder.pullRequestVoteSummary(pullRequestId)];

    if (userId) {
      keys.push(CacheKeyBuilder.pullRequestUserVote(pullRequestId, userId));
    }

    return this.cacheService.delMany(keys);
  }

  // ─── Public vote operations ───────────────────────────────────────────────

  async castVote(input: ICastPRVoteDTO): Promise<IPRVoteSummary> {
    const pullRequest = await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    this.ensureVotingIsAllowed(pullRequest);

    const mutationResult = await this.prVoteRepository.saveVote(
      input.pullRequestId,
      input.userId,
      input.vote
    );

    if (!mutationResult.changed) {
      // Vote didn't change — serve from cache to avoid any extra DB work
      const voteStats = await this.getCachedVoteStats(input.pullRequestId);
      return this.buildVoteSummary(
        input.pullRequestId,
        voteStats,
        mutationResult.currentVote as TPRVoteValue
      );
    }

    // Vote changed — use atomic $inc on the PR document (no aggregate needed)
    const updatedPR = await this.pullRequestRepository.applyVoteMutation(input.pullRequestId, {
      currentVote: mutationResult.currentVote,
      previousVote: mutationResult.previousVote,
      userId: input.userId,
    });

    // Invalidate stale cache and repopulate from the updated PR document
    await this.invalidateVoteCache(input.pullRequestId, input.userId);

    const freshVoteStats = updatedPR
      ? buildPRVoteStatsFromPullRequest(updatedPR)
      : await this.prVoteRepository.getVoteStats(input.pullRequestId);

    await Promise.all([
      cachePRVoteSummary(this.cacheService, input.pullRequestId, freshVoteStats),
      cachePRUserVote(this.cacheService, input.pullRequestId, input.userId, input.vote),
      updatedPR ? cachePRVoteMetadata(this.cacheService, updatedPR) : Promise.resolve(),
    ]);

    return this.buildVoteSummary(
      input.pullRequestId,
      freshVoteStats,
      mutationResult.currentVote as TPRVoteValue
    );
  }

  async removeVote(input: IRemovePRVoteDTO): Promise<IPRVoteSummary> {
    const pullRequest = await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    this.ensureVotingIsAllowed(pullRequest);

    const mutationResult = await this.prVoteRepository.removeUserVote(
      input.pullRequestId,
      input.userId
    );

    if (!mutationResult.changed) {
      const voteStats = await this.getCachedVoteStats(input.pullRequestId);
      return this.buildVoteSummary(input.pullRequestId, voteStats, null);
    }

    // Vote removed — atomic $inc decrement
    const updatedPR = await this.pullRequestRepository.applyVoteMutation(input.pullRequestId, {
      currentVote: null,
      previousVote: mutationResult.previousVote,
    });

    await this.invalidateVoteCache(input.pullRequestId, input.userId);

    const freshVoteStats = updatedPR
      ? buildPRVoteStatsFromPullRequest(updatedPR)
      : await this.prVoteRepository.getVoteStats(input.pullRequestId);

    await Promise.all([
      cachePRVoteSummary(this.cacheService, input.pullRequestId, freshVoteStats),
      cachePRUserVote(this.cacheService, input.pullRequestId, input.userId, null),
    ]);

    return this.buildVoteSummary(input.pullRequestId, freshVoteStats, null);
  }

  async getVoteSummary(input: IGetPRVoteDTO): Promise<IPRVoteSummary> {
    // Access check + user vote fetch run in parallel
    const [, userVote] = await Promise.all([
      this.getAccessiblePullRequest(input.userId, input.pullRequestId),
      this.getCachedUserVote(input.pullRequestId, input.userId),
    ]);

    const voteStats = await this.getCachedVoteStats(input.pullRequestId);

    return this.buildVoteSummary(input.pullRequestId, voteStats, userVote.vote);
  }

  async getUserVote(input: IGetPRVoteDTO): Promise<ICurrentUserPRVote> {
    await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    return this.getCachedUserVote(input.pullRequestId, input.userId);
  }
}

export { PrVoteService };
