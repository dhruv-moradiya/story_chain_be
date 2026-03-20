import {
  STORY_COLLABORATOR_ROLE_CONFIG,
  StoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator-enum';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { IStory } from '@features/story/types/story.types';

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

  /**
   * Validates all conditions for generating a PR based on story settings and user role.
   */
  static canGeneratePR(
    story: IStory,
    role: TStoryCollaboratorRole
  ): { allowed: boolean; message?: string } {
    const isAuthorOrCoAuthor =
      role === StoryCollaboratorRole.OWNER || role === StoryCollaboratorRole.CO_AUTHOR;

    // Rule: Check if branching is allowed for this story
    if (!story.settings.allowBranching && !isAuthorOrCoAuthor) {
      return {
        allowed: false,
        message:
          'Branching is disabled for this story. Only owners and co-authors can contribute new chapters.',
      };
    }

    return { allowed: true };
  }
}
