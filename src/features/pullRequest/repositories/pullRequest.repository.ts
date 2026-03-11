import { IPullRequest, IPullRequestDoc, TPRLabel } from '../types/pullRequest.types';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';
import { PRStatus } from '../types/pullRequest-enum';
import { ID } from '@/types';

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
}
