import { singleton } from 'tsyringe';
import { createPatch, diffLines } from 'diff';
import { BaseModule } from '@utils/baseClass';
import { IPullRequestDto } from '@dto/pullRequest.dto';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';
import { PRType } from '@features/pullRequest/types/pullRequest-enum';

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
      };
    }

    // ── edit_chapter: compute HTML diff ─────────
    if (input.prType === PRType.EDIT_CHAPTER) {
      const original = input.changes.original;
      const proposed = input.changes.proposed;

      const diff = this.computeHtmlDiff(original, proposed);
      const { lineCount, additionsCount, deletionsCount } = this.computeDiffStats(
        original,
        proposed
      );

      return {
        original,
        proposed,
        diff,
        lineCount,
        additionsCount,
        deletionsCount,
      };
    }

    // ── delete_chapter: record removal ──────────
    if (input.prType === PRType.DELETE_CHAPTER) {
      return {
        original: input.changes.original,
        proposed: '',
      };
    }

    this.throwBadRequest('INVALID_INPUT', `Unknown PR type: ${(input as IPullRequestDto).prType}`);
    throw new Error('Unreachable');
  }

  /**
   * Computes a unified diff between two HTML strings.
   */
  private computeHtmlDiff(original: string, proposed: string): string {
    return createPatch(
      'chapter', // filename label
      original,
      proposed,
      'original',
      'proposed'
    );
  }

  /**
   * Counts additions, deletions, and total changed lines.
   */
  private computeDiffStats(
    original: string,
    proposed: string
  ): { lineCount: number; additionsCount: number; deletionsCount: number } {
    const changes = diffLines(original, proposed);

    let additionsCount = 0;
    let deletionsCount = 0;
    let lineCount = 0;

    for (const change of changes) {
      const lines = change.count ?? 0;
      lineCount += lines;
      if (change.added) additionsCount += lines;
      if (change.removed) deletionsCount += lines;
    }

    return { lineCount, additionsCount, deletionsCount };
  }
}
