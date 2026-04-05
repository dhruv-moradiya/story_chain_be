import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ChapterAutoSaveRepository } from '../repositories/chapterAutoSave.repository';
import { IChapterAutoSave } from '../types/chapterAutoSave.types';

@singleton()
export class AutoSaveLifecycleService extends BaseModule {
  constructor(
    @inject(TOKENS.ChapterAutoSaveRepository)
    private readonly chapterAutoSaveRepo: ChapterAutoSaveRepository
  ) {
    super();
  }

  async disableAutoSave(chapterSlug: string, userId: string): Promise<IChapterAutoSave> {
    const autoSave = await this.chapterAutoSaveRepo.findByChapterSlugAndUser(chapterSlug, userId);

    if (!autoSave) {
      this.throwNotFoundError('Auto-save is not enabled for this chapter.');
    }

    const disabledAutoSave =
      await this.chapterAutoSaveRepo.disableAutoSaveForExistingChapter(chapterSlug);

    if (!disabledAutoSave) {
      this.throwInternalError('Failed to disable auto-save. Please try again.');
    }

    return disabledAutoSave;
  }

  async deleteAutoSave(autoSaveId: string): Promise<void> {
    await this.chapterAutoSaveRepo.deleteById(autoSaveId);
  }
}
