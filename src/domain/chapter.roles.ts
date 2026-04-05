import { IChapter } from '@features/chapter/types/chapter.types';
import { IStory } from '@features/story/types/story.types';

export class ChapterRules {
  /**
   * Rule: Check if the user is the author of the chapter
   */
  static isAuthor(chapter: IChapter, userId: string): boolean {
    return chapter.authorId === userId;
  }

  /**
   * Rule: Check if the user is authorized to create a chapter in the story
   */
  static canCreateChapter(
    story: IStory,
    isAuthorOrCoAuthor: boolean
  ): { allowed: boolean; message?: string } {
    if (!story.settings.allowBranching && !isAuthorOrCoAuthor) {
      return {
        allowed: false,
        message: 'You are not authorized to create chapter in this story.',
      };
    }
    return { allowed: true };
  }

  /**
   * Rule: Validate if the parent chapter belongs to the same story
   */
  static validateParent(
    parent: IChapter,
    storySlug: string
  ): { allowed: boolean; message?: string } {
    if (parent.storySlug !== storySlug) {
      return {
        allowed: false,
        message: 'Parent chapter does not belong to the same story.',
      };
    }
    return { allowed: true };
  }

  /**
   * Rule: Calculate depth and ancestors for a new child chapter
   */
  static calculateHierarchy(parent: IChapter): { depth: number; ancestorSlugs: string[] } {
    return {
      depth: parent.depth + 1,
      ancestorSlugs: [...parent.ancestorSlugs, parent.slug],
    };
  }

  static ensureCanEnableAutoSave(chapter: IChapter, userId: string): boolean {
    // rule 1: only owner/collaborator can enable autosave
    if (!this.isAuthor(chapter, userId)) return false;

    return true;
  }

  static ensureCanAutoSaveContent(chapter: IChapter, userId: string): boolean {
    return this.ensureCanEnableAutoSave(chapter, userId);
  }

  static ensureCanEnableAutoSaveForPossiblyNewChapter(chapter: IChapter | null, userId: string) {
    // If chapter exists -> reuse the normal rule
    if (chapter) {
      return ChapterRules.ensureCanEnableAutoSave(chapter, userId);
    }

    // If chapter does NOT exist -> allow auto-save for new chapter
    return true;
  }
}
