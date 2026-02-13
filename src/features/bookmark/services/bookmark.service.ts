import { singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { Bookmark } from '@/models/bookmark.model';
import { IBookmarkService } from '../interfaces/bookmark.service.interface';
import { CreateBookmarkInput } from '../schema/bookmark.schema';
import { MongoServerError } from 'mongodb';

@singleton()
export class BookmarkService extends BaseModule implements IBookmarkService {
  constructor() {
    super();
  }

  async toggleBookmark(userId: string, input: CreateBookmarkInput) {
    const { storySlug, chapterSlug, note } = input;

    try {
      await Bookmark.create({
        userId,
        storySlug,
        chapterSlug,
        note,
      });
      return { isBookmarked: true };
    } catch (error: unknown) {
      if (error instanceof MongoServerError) {
        if (error.code === 11000) {
          await Bookmark.findOneAndDelete({
            userId,
            storySlug,
            chapterSlug,
          });
          return { isBookmarked: false };
        }
      }
      throw error;
    }
  }
}
