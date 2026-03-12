import { TOKENS } from '@/container';
import { ICastPRVoteDTO, IGetPRVoteDTO, IRemovePRVoteDTO } from '@/dto/pr-vote.dto';
import { PullRequestRepository } from '@/features/pullRequest/repositories/pullRequest.repository';
import { PullRequestQueryService } from '@/features/pullRequest/services/pull-request-query.service';
import { PRStatus } from '@/features/pullRequest/types/pullRequest-enum';
import { IPullRequest } from '@/features/pullRequest/types/pullRequest.types';
import { CollaboratorQueryService } from '@/features/storyCollaborator/services/collaborator-query.service';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { PrVoteRepository } from '../repositories/pr-vote-repository';
import { ICurrentUserPRVote, IPRVoteSummary, TPRVoteValue } from '../types/prVote.types';

@singleton()
class PrVoteService extends BaseModule {
  constructor(
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

  private async getAccessiblePullRequest(userId: string, pullRequestId: string) {
    const pullRequest = await this.pullRequestQueryService.getPullRequestById(pullRequestId);
    const userStoryRole = await this.collaboratorQueryService.getCollaboratorRole(
      userId,
      pullRequest.storySlug
    );

    if (!userStoryRole) {
      this.throwForbiddenError(
        'FORBIDDEN',
        'You do not have access to this pull request vote API.'
      );
    }

    return pullRequest;
  }

  private ensureVotingIsAllowed(pullRequest: IPullRequest) {
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

    const voteStats = await this.prVoteRepository.getVoteStats(input.pullRequestId);

    if (mutationResult.changed) {
      await this.pullRequestRepository.syncVoteStats(input.pullRequestId, voteStats, {
        userId: input.userId,
        vote: input.vote,
        previousVote: mutationResult.previousVote,
      });
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

    const voteStats = await this.prVoteRepository.getVoteStats(input.pullRequestId);

    if (mutationResult.changed) {
      await this.pullRequestRepository.syncVoteStats(input.pullRequestId, voteStats);
    }

    return this.buildVoteSummary(input.pullRequestId, voteStats, null);
  }

  async getVoteSummary(input: IGetPRVoteDTO): Promise<IPRVoteSummary> {
    await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    const [userVote, voteStats] = await Promise.all([
      this.prVoteRepository.getUserVote(input.pullRequestId, input.userId),
      this.prVoteRepository.getVoteStats(input.pullRequestId),
    ]);

    return this.buildVoteSummary(input.pullRequestId, voteStats, userVote.vote);
  }

  async getUserVote(input: IGetPRVoteDTO): Promise<ICurrentUserPRVote> {
    await this.getAccessiblePullRequest(input.userId, input.pullRequestId);

    return this.prVoteRepository.getUserVote(input.pullRequestId, input.userId);
  }
}

export { PrVoteService };
