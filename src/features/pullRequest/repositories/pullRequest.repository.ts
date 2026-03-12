import {
  IPullRequest,
  IPullRequestDoc,
  TPRLabel,
  TPRTimelineAction,
} from '../types/pullRequest.types';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';
import { PRStatus } from '../types/pullRequest-enum';
import { ID } from '@/types';
import { TPRVoteValue } from '@/features/prVote/types/prVote.types';

export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }

  async existsPRById(_id: ID) {
    return this.existsById({ filter: { _id } });
  }

  async findUserPRs(userId: string): Promise<IPullRequest[]> {
    return this.find({ filter: { authorId: userId } });
  }

  /**
   * Find all open PRs by a specific author for a given story.
   * Used to detect duplicate open PRs targeting the same chapter.
   */
  async findOpenPRsByAuthorForStory(authorId: string, storySlug: string): Promise<IPullRequest[]> {
    return this.find({ filter: { authorId, storySlug, status: PRStatus.OPEN } });
  }

  /**
   * Find a collaborator's active (open) PR for a specific chapter.
   */
  async findOpenPRByAuthorAndChapter(
    authorId: string,
    chapterSlug: string
  ): Promise<IPullRequest | null> {
    return this.findOne({ filter: { authorId, chapterSlug, status: PRStatus.OPEN } });
  }

  async updatePRLable(prId: string, labels: TPRLabel[]) {
    return this.findOneAndUpdate({ filter: { _id: prId }, update: { labels } });
  }

  async syncVoteStats(
    prId: string,
    voteStats: {
      upvotes: number;
      downvotes: number;
      score: number;
    },
    timelineContext?: {
      userId: string;
      vote: TPRVoteValue;
      previousVote: TPRVoteValue | null;
    }
  ) {
    const update: {
      $set: {
        'votes.upvotes': number;
        'votes.downvotes': number;
        'votes.score': number;
      };
      $push?: {
        timeline: {
          action: TPRTimelineAction;
          performedBy: string;
          performedAt: Date;
          metadata: {
            vote: TPRVoteValue;
            previousVote: TPRVoteValue | null;
          };
        };
      };
    } = {
      $set: {
        'votes.upvotes': voteStats.upvotes,
        'votes.downvotes': voteStats.downvotes,
        'votes.score': voteStats.score,
      },
    };

    if (timelineContext) {
      update.$push = {
        timeline: {
          action: 'voted',
          performedBy: timelineContext.userId,
          performedAt: new Date(),
          metadata: {
            vote: timelineContext.vote,
            previousVote: timelineContext.previousVote,
          },
        },
      };
    }

    return this.findOneAndUpdate({
      filter: { _id: prId },
      update,
    });
  }

  async syncReviewState(
    prId: string,
    input: {
      status: IPullRequest['status'];
      reviewsReceived: number;
      approvalsStatus: {
        received: number;
        pending: number;
        approvers: string[];
        blockers: string[];
        canMerge: boolean;
      };
      timelineEntries?: Array<{
        action: TPRTimelineAction;
        performedBy?: string;
        performedAt: Date;
        metadata?: Record<string, unknown>;
      }>;
    }
  ) {
    const update: {
      $set: {
        status: IPullRequest['status'];
        'stats.reviewsReceived': number;
        'approvalsStatus.received': number;
        'approvalsStatus.pending': number;
        'approvalsStatus.approvers': string[];
        'approvalsStatus.blockers': string[];
        'approvalsStatus.canMerge': boolean;
      };
      $push?: {
        timeline: {
          $each: Array<{
            action: TPRTimelineAction;
            performedBy?: string;
            performedAt: Date;
            metadata?: Record<string, unknown>;
          }>;
        };
      };
    } = {
      $set: {
        status: input.status,
        'stats.reviewsReceived': input.reviewsReceived,
        'approvalsStatus.received': input.approvalsStatus.received,
        'approvalsStatus.pending': input.approvalsStatus.pending,
        'approvalsStatus.approvers': input.approvalsStatus.approvers,
        'approvalsStatus.blockers': input.approvalsStatus.blockers,
        'approvalsStatus.canMerge': input.approvalsStatus.canMerge,
      },
    };

    if (input.timelineEntries && input.timelineEntries.length > 0) {
      update.$push = {
        timeline: {
          $each: input.timelineEntries,
        },
      };
    }

    return this.findOneAndUpdate({
      filter: { _id: prId, status: { $ne: PRStatus.MERGED } },
      update,
    });
  }
}
