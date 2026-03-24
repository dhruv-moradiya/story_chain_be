import { IPullRequestDto } from '@dto/pullRequest.dto';
import { PRType } from '@features/pullRequest/types/pullRequest-enum';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';
import { BaseModule } from '@utils/baseClass';
import { singleton } from 'tsyringe';

/**
 * Service dedicated to calculating diffs and resolving changes for Pull Requests.
 * Keeps the main service clean and focused on orchestration.
 */
@singleton()
export class PullRequestDiffService extends BaseModule {
  /**
   * Resolves the changes based on PR type, computing diffs for edits.
   */
  resolveChanges(input: IPullRequestDto): IPullRequest['changes'] {
    // ── new_chapter: brand new content ────────────
    if (input.prType === PRType.NEW_CHAPTER) {
      return {
        proposed: input.changes.proposed,
        original: '',
        readingMinutes: input.changes.proposed.length / 200,
        wordCount: input.changes.proposed.length,
      };
    }

    // ── edit_chapter: compute HTML diff ─────────
    if (input.prType === PRType.EDIT_CHAPTER) {
      const original = input.changes.original;
      const proposed = input.changes.proposed;

      return {
        original,
        proposed,
        readingMinutes: input.changes.proposed.length / 200,
        wordCount: input.changes.proposed.length,
      };
    }

    // ── delete_chapter: record removal ──────────
    if (input.prType === PRType.DELETE_CHAPTER) {
      return {
        original: input.changes.original,
        proposed: '',
        readingMinutes: input.changes.original.length / 200,
        wordCount: input.changes.original.length,
      };
    }

    this.throwBadRequest('INVALID_INPUT', `Unknown PR type: ${(input as IPullRequestDto).prType}`);
  }
}
