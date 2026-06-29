import { singleton } from 'tsyringe';
import { BaseModule } from '@utils/baseClass';
import { Bookmark } from '@/models/bookmark.model';
import { IBookmarkService } from '../interfaces/bookmark.service.interface';
import { CreateBookmarkInput, TGetBookmarksQueryInput } from '../schema/bookmark.schema';
import { MongoServerError } from 'mongodb';
import { IPagination } from '@/types';
import { BookmarkPipelineBuilder } from '../pipelines/bookmarkPipeline.builder';

@singleton()
export class BookmarkService extends BaseModule implements IBookmarkService {
  constructor() {
    super();
  }

  async toggleBookmark(userId: string, input: CreateBookmarkInput) {
    const { storySlug, chapterSlug, note } = input;

    // Try to find and delete the bookmark first (Toggle OFF)
    const deletedBookmark = await Bookmark.findOneAndDelete({
      userId,
      chapterSlug,
    });

    if (deletedBookmark) {
      return { isBookmarked: false };
    }

    // If it didn't exist, create it (Toggle ON)
    try {
      await Bookmark.create({
        userId,
        storySlug,
        chapterSlug,
        note,
      });
      return { isBookmarked: true };
    } catch (error: unknown) {
      // Edge case: concurrent request created the bookmark
      // exactly between our delete check and create attempt.
      if (error instanceof MongoServerError && error.code === 11000) {
        return { isBookmarked: true };
      }
      throw error;
    }
  }

  async getBookmarks(
    userId: string,
    input: TGetBookmarksQueryInput
  ): Promise<{ docs: any[] } & IPagination> {
    const { query, order, limit, page } = input;

    const builder = new BookmarkPipelineBuilder().findByUserId(userId);

    if (query) {
      builder.addStage({
        $match: { note: { $regex: query, $options: 'i' } },
      });
    }

    const basePipeline = builder.getPipeline();

    const countResult = await Bookmark.aggregate([...basePipeline, { $count: 'totalDocs' }]);
    const totalDocs = countResult[0]?.totalDocs || 0;

    const sortOrder = order === 'oldest' ? 1 : -1;

    builder.attachStory().attachChapter().sortByCreatedAt(sortOrder).paginate(page, limit);

    const docs = await Bookmark.aggregate(builder.build());

    const totalPages = Math.ceil(totalDocs / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    const pagination: IPagination = {
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage,
      hasNextPage,
      prevPage: hasPrevPage ? page - 1 : null,
      nextPage: hasNextPage ? page + 1 : null,
    };

    return {
      docs,
      ...pagination,
    };
  }
}
