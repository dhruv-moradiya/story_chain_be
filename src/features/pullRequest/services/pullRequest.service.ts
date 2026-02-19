import { inject, singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { TOKENS } from '@container/tokens';
import { IPullRequestDto } from '@dto/pullRequest.dto';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';
import { ICreatePullRequestService } from '@features/pullRequest/services/interfaces/create-pull-request.service';
import { PullRequestRepository } from '@features/pullRequest/repositories/pullRequest.repository';
import { PullRequestValidator } from '@features/pullRequest/validators/pullRequest.validator';
import { PullRequestDiffService } from '@features/pullRequest/services/pullRequestDiff.service';
import { PRStatus } from '@features/pullRequest/types/pullRequest-enum';

/**
 * Service for managing Pull Requests.
 * Orchestrates validation, diff calculation, and persistence.
 */
@singleton()
export class PullRequestService extends BaseModule implements ICreatePullRequestService {
  constructor(
    @inject(TOKENS.PullRequestRepository)
    private readonly pullRequestRepository: PullRequestRepository,
    @inject(TOKENS.PullRequestValidator)
    private readonly pullRequestValidator: PullRequestValidator,
    @inject(TOKENS.PullRequestDiffService)
    private readonly pullRequestDiffService: PullRequestDiffService
  ) {
    super();
  }

  /**
   * Creates a new Pull Request.
   *
   * Steps:
   * 1. Validate the request (permissions, existence, duplicates).
   * 2. Calculate diffs between original and proposed content.
   * 3. Persist the PR to the database.
   */
  async create(input: IPullRequestDto): Promise<IPullRequest> {
    const {
      userId,
      storySlug,
      chapterSlug,
      parentChapterSlug,
      prType,
      title,
      description,
      isDraft,
    } = input;

    // ── 1. Validate Request ──────────────────────────────────────────────────
    // This validates story, collaborator role/status, parent/chapter existence, and duplicates.
    await this.pullRequestValidator.validateCreateRequest(
      userId,
      storySlug,
      chapterSlug,
      parentChapterSlug,
      prType
    );

    // ── 2. Build Changes (Diff) ──────────────────────────────────────────────
    const resolvedChanges = this.pullRequestDiffService.resolveChanges(input);

    // ── 3. Create PR ─────────────────────────────────────────────────────────
    const pr = await this.pullRequestRepository.create({
      title,
      description: description ?? '',
      storySlug,
      chapterSlug,
      parentChapterSlug,
      authorId: userId,
      prType,
      changes: resolvedChanges,
      status: PRStatus.OPEN,
      isDraft: isDraft ?? false,
      timeline: [
        {
          action: 'CREATED',
          performedBy: userId,
          performedAt: new Date(),
        },
      ],
    });

    this.logInfo(`PR created: "${pr.title}" [${prType}] by ${userId} for story ${storySlug}`);

    return pr;
  }
}
