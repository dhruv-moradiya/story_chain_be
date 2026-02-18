import { IPullRequest, IPullRequestDoc } from '../types/pullRequest.types';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';
import { PRStatus } from '../types/pullRequest-enum';

export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }

  /**
   * Find all open PRs by a specific author for a given story.
   * Used to detect duplicate open PRs targeting the same chapter.
   */
  async findOpenPRsByAuthorForStory(authorId: string, storySlug: string): Promise<IPullRequest[]> {
    return this.find({ authorId, storySlug, status: PRStatus.OPEN });
  }

  /**
   * Find a collaborator's active (open) PR for a specific chapter.
   */
  async findOpenPRByAuthorAndChapter(
    authorId: string,
    chapterSlug: string
  ): Promise<IPullRequest | null> {
    return this.findOne({ authorId, chapterSlug, status: PRStatus.OPEN });
  }
}
