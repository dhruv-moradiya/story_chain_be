import { CHAPTER_LIMITS } from '../../../constants';
import { BaseValidator } from '../../../utils';
import { IStory } from '../../story/story.types';
import { IChapter } from '../chapter.types';

export class BranchingValidator extends BaseValidator {
  async validate({ story, parentChapter }: { story: IStory; parentChapter: IChapter }) {
    if (!story.settings.allowBranching) {
      this.throwForbiddenError('Branching is not allowed for this story');
    }

    const { MAX: MAX_DEPTH } = CHAPTER_LIMITS.DEPTH;
    if (parentChapter.depth >= MAX_DEPTH) {
      this.throwValidationError(`Maximum story depth (${MAX_DEPTH}) reached`);
    }

    const { MAX_PER_CHAPTER } = CHAPTER_LIMITS.BRANCHES;
    if (parentChapter.stats.childBranches >= MAX_PER_CHAPTER) {
      this.throwValidationError(`Maximum branches (${MAX_PER_CHAPTER}) reached for this chapter`);
    }
  }
}
