import { STORY_COLLABORATOR_ROLE_CONFIG } from '@features/storyCollaborator/types/storyCollaborator-enum';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';

export class PullRequestRules {
  /**
   * Checks whether a collaborator's role grants them the ability to write chapters
   * (i.e., submit PRs). All roles with `canWriteChapters` can create PRs.
   */
  static canRoleCreatePR(role: TStoryCollaboratorRole): boolean {
    return STORY_COLLABORATOR_ROLE_CONFIG[role].permissions.canWriteChapters;
  }

  /**
   * Validates that the author is not submitting a duplicate open PR
   * for the same chapter.
   */
  static hasDuplicateOpenPR(
    _authorId: string,
    chapterSlug: string,
    existingOpenPRChapterSlugs: string[]
  ): boolean {
    // A duplicate is an open PR by the same author targeting the same chapter
    return existingOpenPRChapterSlugs.includes(chapterSlug);
  }
}
