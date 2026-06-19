import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { VoteRepository, IVoteCounts } from './vote.repository';
import { ChapterRepository } from '@/features/chapter/repositories/chapter.repository';
import { StoryRepository } from '@/features/story/repositories/story.repository';
import { IOperationOptions } from '@/types';

type VoteType = 'upvote' | 'downvote';

interface IVoteResult {
  action: 'created' | 'changed' | 'removed';
  currentVote: VoteType | null;
  counts: IVoteCounts;
}

interface IRemoveVoteResult {
  action: 'removed' | 'no_vote';
  counts: IVoteCounts;
}

interface IUserVoteStatus {
  hasVoted: boolean;
  voteType: VoteType | null;
}

@singleton()
export class VoteService extends BaseModule {
  constructor(
    @inject(TOKENS.VoteRepository)
    private readonly voteRepository: VoteRepository,
    @inject(TOKENS.ChapterRepository)
    private readonly chapterRepository: ChapterRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepository: StoryRepository
  ) {
    super();
  }

  // ==================== CHAPTER VOTING ====================

  /**
   * Cast or toggle a vote on a chapter.
   * - If user has no vote → create it
   * - If user voted in the same direction → remove it (toggle off)
   * - If user voted in the opposite direction → switch it
   *
   * After mutation, recalculates and syncs denormalized counts on the chapter document.
   */
  async voteOnChapter(
    chapterSlug: string,
    userId: string,
    voteType: VoteType,
    options: IOperationOptions = {}
  ): Promise<IVoteResult> {
    const chapter = await this.chapterRepository.findBySlug(chapterSlug, options);
    if (!chapter) this.throwNotFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');

    const voteValue = voteType === 'upvote' ? 1 : -1;
    const filter = { chapterSlug, userId };

    // Check for existing vote
    const existingVote = await this.voteRepository.findUserVote(filter, options);

    let action: IVoteResult['action'];
    let currentVote: VoteType | null;

    if (!existingVote) {
      // No existing vote → create new
      await this.voteRepository.upsertVote(filter, voteValue, options);
      action = 'created';
      currentVote = voteType;
    } else if (existingVote.vote === voteValue) {
      // Same direction → toggle off (remove)
      await this.voteRepository.deleteVote(filter, options);
      action = 'removed';
      currentVote = null;
    } else {
      // Opposite direction → switch
      await this.voteRepository.upsertVote(filter, voteValue, options);
      action = 'changed';
      currentVote = voteType;
    }

    // Recalculate and sync denormalized counts
    const counts = await this.syncChapterVoteCounts(chapterSlug, options);

    this.logInfo(
      `Chapter vote ${action}: chapter=${chapterSlug}, user=${userId}, vote=${currentVote}`
    );

    return { action, currentVote, counts };
  }

  /**
   * Remove a user's vote from a chapter.
   */
  async removeChapterVote(
    chapterSlug: string,
    userId: string,
    options: IOperationOptions = {}
  ): Promise<IRemoveVoteResult> {
    const chapter = await this.chapterRepository.findBySlug(chapterSlug, options);
    if (!chapter) this.throwNotFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');

    const deleted = await this.voteRepository.deleteVote({ chapterSlug, userId }, options);

    if (!deleted) {
      const counts = await this.voteRepository.aggregateVoteCounts({ chapterSlug }, options);
      return { action: 'no_vote', counts };
    }

    const counts = await this.syncChapterVoteCounts(chapterSlug, options);

    this.logInfo(`Chapter vote removed: chapter=${chapterSlug}, user=${userId}`);

    return { action: 'removed', counts };
  }

  // ==================== STORY VOTING ====================

  /**
   * Cast or toggle a vote on a story.
   * Same toggle semantics as chapter voting.
   */
  async voteOnStory(
    storySlug: string,
    userId: string,
    voteType: VoteType,
    options: IOperationOptions = {}
  ): Promise<IVoteResult> {
    const story = await this.storyRepository.findBySlug(storySlug, options);
    if (!story) this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found');

    const voteValue = voteType === 'upvote' ? 1 : -1;
    const filter = { storySlug, userId };

    const existingVote = await this.voteRepository.findUserVote(filter, options);

    let action: IVoteResult['action'];
    let currentVote: VoteType | null;

    if (!existingVote) {
      await this.voteRepository.upsertVote(filter, voteValue, options);
      action = 'created';
      currentVote = voteType;
    } else if (existingVote.vote === voteValue) {
      await this.voteRepository.deleteVote(filter, options);
      action = 'removed';
      currentVote = null;
    } else {
      await this.voteRepository.upsertVote(filter, voteValue, options);
      action = 'changed';
      currentVote = voteType;
    }

    const counts = await this.syncStoryVoteCounts(storySlug, options);

    this.logInfo(`Story vote ${action}: story=${storySlug}, user=${userId}, vote=${currentVote}`);

    return { action, currentVote, counts };
  }

  /**
   * Remove a user's vote from a story.
   */
  async removeStoryVote(
    storySlug: string,
    userId: string,
    options: IOperationOptions = {}
  ): Promise<IRemoveVoteResult> {
    const story = await this.storyRepository.findBySlug(storySlug, options);
    if (!story) this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found');

    const deleted = await this.voteRepository.deleteVote({ storySlug, userId }, options);

    if (!deleted) {
      const counts = await this.voteRepository.aggregateVoteCounts({ storySlug }, options);
      return { action: 'no_vote', counts };
    }

    const counts = await this.syncStoryVoteCounts(storySlug, options);

    this.logInfo(`Story vote removed: story=${storySlug}, user=${userId}`);

    return { action: 'removed', counts };
  }

  // ==================== USER VOTE STATUS ====================

  /**
   * Get a user's current vote status for a chapter.
   */
  async getChapterVoteStatus(
    chapterSlug: string,
    userId: string,
    options: IOperationOptions = {}
  ): Promise<IUserVoteStatus> {
    const chapter = await this.chapterRepository.findBySlug(chapterSlug, options);
    if (!chapter) this.throwNotFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');

    const vote = await this.voteRepository.findUserVote({ chapterSlug, userId }, options);

    return {
      hasVoted: !!vote,
      voteType: vote ? (vote.vote === 1 ? 'upvote' : 'downvote') : null,
    };
  }

  /**
   * Get a user's current vote status for a story.
   */
  async getStoryVoteStatus(
    storySlug: string,
    userId: string,
    options: IOperationOptions = {}
  ): Promise<IUserVoteStatus> {
    const story = await this.storyRepository.findBySlug(storySlug, options);
    if (!story) this.throwNotFoundError('STORY_NOT_FOUND', 'Story not found');

    const vote = await this.voteRepository.findUserVote({ storySlug, userId }, options);

    return {
      hasVoted: !!vote,
      voteType: vote ? (vote.vote === 1 ? 'upvote' : 'downvote') : null,
    };
  }

  // ==================== PRIVATE: STATS SYNC ====================

  /**
   * Recalculate vote counts from the Vote collection and update
   * the denormalized fields on the Chapter document.
   */
  private async syncChapterVoteCounts(
    chapterSlug: string,
    options: IOperationOptions = {}
  ): Promise<IVoteCounts> {
    const counts = await this.voteRepository.aggregateVoteCounts({ chapterSlug }, options);

    await this.chapterRepository.findOneAndUpdate({
      filter: { slug: chapterSlug },
      update: {
        $set: {
          'votes.upvotes': counts.upvotes,
          'votes.downvotes': counts.downvotes,
          'votes.score': counts.score,
        },
      },
      options: { session: options.session },
    });

    return counts;
  }

  /**
   * Recalculate vote counts from the Vote collection and update
   * the denormalized fields on the Story document.
   */
  private async syncStoryVoteCounts(
    storySlug: string,
    options: IOperationOptions = {}
  ): Promise<IVoteCounts> {
    const counts = await this.voteRepository.aggregateVoteCounts({ storySlug }, options);

    await this.storyRepository.findOneAndUpdate({
      filter: { slug: storySlug },
      update: {
        $set: {
          'stats.totalVotes': counts.upvotes + counts.downvotes,
          'stats.upvotes': counts.upvotes,
          'stats.downvotes': counts.downvotes,
          'stats.score': counts.score,
        },
      },
      options: { session: options.session },
    });

    return counts;
  }
}

export type { VoteType, IVoteResult, IRemoveVoteResult, IUserVoteStatus };
