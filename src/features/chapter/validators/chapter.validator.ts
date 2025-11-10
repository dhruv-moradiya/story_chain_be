import { BaseValidator } from '../../../utils';
import { IChapter } from '../chapter.types';
import { ChapterRepository } from '../repositories/chapter.repository';

export class ChapterValidator extends BaseValidator<string, IChapter | null> {
  private readonly chapterRepo: ChapterRepository;

  constructor() {
    super();
    this.chapterRepo = new ChapterRepository();
  }

  async validate(chapterId: string): Promise<IChapter | null> {
    const chapter = await this.chapterRepo.findById(chapterId);

    if (!chapter) {
      this.throwValidationError('Chapter not found');
      return null;
    }

    return chapter;
  }

  async authorizeChapterEdit(userId: string, chapterId: string): Promise<IChapter> {
    const chapter = await this.chapterRepo.findById(chapterId);

    if (!chapter) {
      this.throwValidationError('Chapter not found');
    }

    if (chapter.authorId.toString() !== userId) {
      this.throwValidationError('You are not authorized to edit this chapter');
    }

    return chapter;
  }
}
