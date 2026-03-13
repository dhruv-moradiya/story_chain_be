import { TOKENS } from '@/container';
import { ICastPRVoteDTO, IGetPRVoteDTO, IRemovePRVoteDTO } from '@/dto/pr-vote.dto';
import { PullRequestRepository } from '@/features/pullRequest/repositories/pullRequest.repository';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { PRStatus } from '@/features/pullRequest/types/pullRequest-enum';
import { IPullRequest } from '@/features/pullRequest/types/pullRequest.types';
import { StoryRepository } from '@/features/story/repositories/story.repository';
import { IStorySettingsWithImages } from '@/features/story/types/story.types';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { TStoryCollaboratorRole } from '@/features/storyCollaborator/types/storyCollaborator.types';
import { CacheKeyBuilder } from '@/infrastructure';
import { CacheService } from '@/infrastructure/cache/cache.service';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrVoteRepository } from '../repositories/pr-vote-repository';
import { ICurrentUserPRVote, IPRVoteSummary, TPRVoteValue } from '../types/prVote.types';
import {
  ICachedPRVoteMetadata,
  ICachedPRVoteStats,
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
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: StoryRepository,
    @inject(TOKENS.CollaboratorQueryService)
    private readonly collaboratorQueryService: CollaboratorQueryService
  ) {
    super();
  }

  private async hydratePullRequestVoteCache(
    pullRequestId: string
  ): Promise<{ metadata: ICachedPRVoteMetadata; voteStats: ICachedPRVoteStats }> {
    const pullRequest = await this.pullRequestQueryService.getPullRequestById(pullRequestId);
    const voteStats = buildPRVoteStatsFromPullRequest(pullRequest);
    const metadata = await cachePRVoteMetadata(this.cacheService, pullRequest);

    await cachePRVoteSummary(this.cacheService, pullRequestId, voteStats);

    return { metadata, voteStats };
  }

  private async getPullRequestMetadata(pullRequestId: string): Promise<ICachedPRVoteMetadata> {
    const key = CacheKeyBuilder.pullRequestMetadata(pullRequestId);
    const cachedMetadata = await this.cacheService.get<ICachedPRVoteMetadata>(key);

    if (cachedMetadata) {
      return cachedMetadata;
    }

    const { metadata } = await this.hydratePullRequestVoteCache(pullRequestId);
    return metadata;
  }

  private async getStorySettingsBySlug(storySlug: string): Promise<IStorySettingsWithImages> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.storySettings(storySlug),
      async () => {
        const story = await this.storyRepository.findBySlug(storySlug);

        if (!story) {
          this.throwNotFoundError('STORY_NOT_FOUND', `Story not found for slug: ${storySlug}`);
        }

        return {
          settings: story.settings,
          coverImage: story.coverImage,
          cardImage: story.cardImage,
        };
      },
      { ttlKey: 'STORY_SETTINGS' }
    );
  }

  private async getCachedCollaboratorRole(
    userId: string,
    storySlug: string
  ): Promise<TStoryCollaboratorRole | null> {
    const cachedAccess = await this.cacheService.getOrSet<{ role: TStoryCollaboratorRole | null }>(
      CacheKeyBuilder.collaboratorRole(userId, storySlug),
      async () => ({
        role: await this.collaboratorQueryService.getCollaboratorRole(userId, storySlug),
      }),
      { ttlKey: 'COLLABORATOR_ROLE' }
    );

    return cachedAccess.role;
  }

  private async getAccessiblePullRequest(
    userId: string,
    pullRequestId: string
  ): Promise<ICachedPRVoteMetadata> {
    const pullRequest = await this.getPullRequestMetadata(pullRequestId);
    const storySettings = await this.getStorySettingsBySlug(pullRequest.storySlug);
    const allowGeneralVoting =
      storySettings.settings.isPublic && storySettings.settings.allowVoting;

    if (!allowGeneralVoting) {
      const userStoryRole = await this.getCachedCollaboratorRole(userId, pullRequest.storySlug);

      if (!userStoryRole) {
        this.throwForbiddenError(
          'FORBIDDEN',
          'You do not have access to this pull request vote API.'
        );
      }
    }

    return pullRequest;
  }

  private ensureVotingIsAllowed(pullRequest: Pick<IPullRequest, 'status'>) {
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

  private async getVoteStats(pullRequestId: string): Promise<ICachedPRVoteStats> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.pullRequestVoteSummary(pullRequestId),
      async () => {
        const { voteStats } = await this.hydratePullRequestVoteCache(pullRequestId);
        return voteStats;
      },
      { ttlKey: 'PULL_REQUEST_VOTE_SUMMARY' }
    );
  }

  private async getCachedUserVote(
    pullRequestId: string,
    userId: string
  ): Promise<ICurrentUserPRVote> {
    return this.cacheService.getOrSet(
      CacheKeyBuilder.pullRequestUserVote(pullRequestId, userId),
      () => this.prVoteRepository.getUserVote(pullRequestId, userId),
      { ttlKey: 'PULL_REQUEST_USER_VOTE' }
    );
  }

  private async syncVoteCaches(input: {
    pullRequestId: string;
    userId: string;
    currentUserVote: TPRVoteValue | null;
    voteStats: ICachedPRVoteStats;
    pullRequest?: Pick<IPullRequest, '_id' | 'storySlug' | 'authorId' | 'status'>;
  }): Promise<void> {
    const tasks: Promise<unknown>[] = [
      cachePRVoteSummary(this.cacheService, input.pullRequestId, input.voteStats),
      cachePRUserVote(this.cacheService, input.pullRequestId, input.userId, input.currentUserVote),
    ];

    if (input.pullRequest) {
      tasks.push(cachePRVoteMetadata(this.cacheService, input.pullRequest));
    }

    await Promise.all(tasks);
  }

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

  async castVote(input: ICastPRVoteDTO): Promise<IPRVoteSummary> {
    const pullRequest = await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    this.ensureVotingIsAllowed(pullRequest);

    const mutationResult = await this.prVoteRepository.saveVote(
      input.pullRequestId,
      input.userId,
      input.vote
    );

    let voteStats: ICachedPRVoteStats;

    if (mutationResult.changed) {
      const updatedPullRequest = await this.pullRequestRepository.applyVoteMutation(
        input.pullRequestId,
        {
          userId: input.userId,
          currentVote: mutationResult.currentVote,
          previousVote: mutationResult.previousVote,
        }
      );

      if (!updatedPullRequest) {
        this.throwNotFoundError(
          'PULL_REQUEST_NOT_FOUND',
          'The requested pull request was not found. Please check the ID and try again.'
        );
      }

      voteStats = buildPRVoteStatsFromPullRequest(updatedPullRequest);

      await this.syncVoteCaches({
        pullRequestId: input.pullRequestId,
        userId: input.userId,
        currentUserVote: mutationResult.currentVote,
        voteStats,
        pullRequest: updatedPullRequest,
      });
    } else {
      voteStats = await this.getVoteStats(input.pullRequestId);
      await cachePRUserVote(
        this.cacheService,
        input.pullRequestId,
        input.userId,
        mutationResult.currentVote
      );
    }

    return this.buildVoteSummary(
      input.pullRequestId,
      voteStats,
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

    let voteStats: ICachedPRVoteStats;

    if (mutationResult.changed) {
      const updatedPullRequest = await this.pullRequestRepository.applyVoteMutation(
        input.pullRequestId,
        {
          currentVote: mutationResult.currentVote,
          previousVote: mutationResult.previousVote,
        }
      );

      if (!updatedPullRequest) {
        this.throwNotFoundError(
          'PULL_REQUEST_NOT_FOUND',
          'The requested pull request was not found. Please check the ID and try again.'
        );
      }

      voteStats = buildPRVoteStatsFromPullRequest(updatedPullRequest);

      await this.syncVoteCaches({
        pullRequestId: input.pullRequestId,
        userId: input.userId,
        currentUserVote: null,
        voteStats,
        pullRequest: updatedPullRequest,
      });
    } else {
      voteStats = await this.getVoteStats(input.pullRequestId);
      await cachePRUserVote(this.cacheService, input.pullRequestId, input.userId, null);
    }

    return this.buildVoteSummary(input.pullRequestId, voteStats, null);
  }

  async getVoteSummary(input: IGetPRVoteDTO): Promise<IPRVoteSummary> {
    await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    const [userVote, voteStats] = await Promise.all([
      this.getCachedUserVote(input.pullRequestId, input.userId),
      this.getVoteStats(input.pullRequestId),
    ]);

    return this.buildVoteSummary(input.pullRequestId, voteStats, userVote.vote);
  }

  async getUserVote(input: IGetPRVoteDTO): Promise<ICurrentUserPRVote> {
    await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    return this.getCachedUserVote(input.pullRequestId, input.userId);
  }
}

export { PrVoteService };
