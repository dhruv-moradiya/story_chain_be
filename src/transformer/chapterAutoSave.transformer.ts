import { IChapterAutoSave } from '../features/chapterAutoSave/chapterAutoSave.types';
import { IChapterAutoSaveResponse } from '../types/response/chapterAutoSave.response.types';

export class ChapterAutoSaveTransformer {
  static enableAutoSaveRespose(input: IChapterAutoSave): IChapterAutoSaveResponse {
    return {
      _id: input._id,
      userId: input.userId,
      ...(input.chapterId ? { chapterId: input.chapterId } : { draftId: input.draftId }),
    };
  }
}
