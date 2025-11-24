import { BaseModule } from '../../../utils/baseClass';
import { IChapterTreeBuilderParams, IChapterTreeMetadata } from '../chapter.types';
import { ChapterRepository } from '../repositories/chapter.repository';

export class ChapterTreeBuilder extends BaseModule {
  private chapterRepo: ChapterRepository;

  constructor(chapterRepo: ChapterRepository) {
    super();
    this.chapterRepo = chapterRepo;
  }

  async build(data: IChapterTreeBuilderParams): Promise<IChapterTreeMetadata> {
    const { storyId, parentChapterId, userId, storyCreatorId } = data;
    if (!parentChapterId) {
      return await this._buildRoot(storyId, userId, storyCreatorId);
    } else {
      return await this._buildBranch(storyId, parentChapterId);
    }
  }

  async _buildRoot(storyId: string, userId: string, storyCreatorId: string) {
    const existingRoot = await this.chapterRepo.findRoot(storyId);

    if (existingRoot) {
      this.throwValidationError('Root chapter already exists for this story');
    }

    if (storyCreatorId !== userId) {
      this.throwForbiddenError('Only the story creator can add the root chapter');
    }

    return {
      ancestorIds: [],
      depth: 0,
      isRootChapter: true,
      parentChapter: null,
    };
  }

  async _buildBranch(storyId: string, parentChapterId: string) {
    const parentChapter = await this.chapterRepo.findById(parentChapterId);

    if (!parentChapter) {
      this.throwValidationError('Parent chapter not found');
    }

    if (parentChapter!.storyId.toString() !== storyId) {
      this.throwValidationError('Parent chapter does not belong to this story');
    }

    if (parentChapter!.status === 'DELETED') {
      this.throwValidationError('Cannot branch from a deleted chapter');
    }

    const ancestorIds = [...(parentChapter!.ancestorIds || []), parentChapter!._id];

    return {
      ancestorIds,
      depth: parentChapter!.depth + 1,
      isRootChapter: false,
      parentChapter: parentChapter!,
    };
  }
}
