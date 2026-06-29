import { PipelineStage } from 'mongoose';
import { singleton } from 'tsyringe';
import { Bookmark } from '@models/bookmark.model';
import { IOperationOptions } from '@/types';
import { BaseRepository } from '@utils/baseClass';
import { IBookmark, IBookmarkDoc } from '../types/bookmark.types';

@singleton()
export class BookmarkRepository extends BaseRepository<IBookmark, IBookmarkDoc> {
  constructor() {
    super(Bookmark);
  }

  /**
   * Generic aggregation executor
   */
  async aggregateBookmarks<T = IBookmark>(
    pipeline: PipelineStage[],
    options: IOperationOptions = {}
  ): Promise<T[]> {
    return this.model
      .aggregate<T>(pipeline)
      .session(options.session ?? null)
      .exec();
  }
}
