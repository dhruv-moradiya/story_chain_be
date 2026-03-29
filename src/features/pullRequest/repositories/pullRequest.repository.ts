import { singleton } from 'tsyringe';
import { PullRequest } from '@models/pullRequest.model';
import { BaseRepository } from '@utils/baseClass';
import { IPullRequest, IPullRequestDoc } from '@features/pullRequest/types/pullRequest.types';
import { IOperationOptions } from '@/types';

@singleton()
export class PullRequestRepository extends BaseRepository<IPullRequest, IPullRequestDoc> {
  constructor() {
    super(PullRequest);
  }

  /**
   * Check if an open PR already exists for the given chapter slug submitted by a specific author.
   * Prevents duplicate open PRs for the same chapter from the same user.
   */
  findOpenByChapterAndAuthor(
    chapterSlug: string,
    authorId: string,
    options: IOperationOptions = {}
  ): Promise<IPullRequest | null> {
    return this.findOne({
      filter: {
        chapterSlug,
        authorId,
        status: { $in: ['open', 'approved'] },
      },
      options,
    });
  }

  /**
   * Find all open/approved PRs for a story (review queue).
   */
  findOpenByStory(storySlug: string, options: IOperationOptions = {}): Promise<IPullRequest[]> {
    return this.find({
      filter: { storySlug, status: { $in: ['open', 'approved'] } },
      options,
    });
  }

  /**
   * Attach the PR _id back to the chapter's pullRequest.prId field after creation.
   * This is done inline in the service using the ChapterRepository.
   */
}
