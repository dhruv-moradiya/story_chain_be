import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { ID } from '@/types';
import { toId } from '@/utils';

class BookmarkPipelineBuilder extends BasePipelineBuilder<BookmarkPipelineBuilder> {
  /**
   * Matches a bookmark by its ID.
   */
  findById(bookmarkId: ID) {
    this.pipeline.push({
      $match: {
        _id: toId(bookmarkId),
      },
    });
    return this;
  }

  /**
   * Matches bookmarks for a specific user.
   */
  findByUserId(userId: string) {
    this.pipeline.push({
      $match: {
        userId,
      },
    });
    return this;
  }

  /**
   * Matches bookmarks by story slug.
   */
  findByStorySlug(storySlug: string) {
    this.pipeline.push({
      $match: {
        storySlug,
      },
    });
    return this;
  }

  /**
   * Matches bookmarks by chapter slug.
   */
  findByChapterSlug(chapterSlug: string) {
    this.pipeline.push({
      $match: {
        chapterSlug,
      },
    });
    return this;
  }

  /**
   * Attaches the story details.
   */
  attachStory() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'stories',
          let: { storySlug: '$storySlug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$slug', '$$storySlug'],
                },
              },
            },
            {
              $project: {
                slug: 1,
                title: 1,
                _id: 0, // exclude _id if you only want slug and title, or 1 if you want it
              },
            },
          ],
          as: 'story',
        },
      },
      {
        $unwind: {
          path: '$story',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }

  /**
   * Attaches the chapter details.
   */
  attachChapter() {
    this.pipeline.push(
      {
        $lookup: {
          from: 'chapters',
          let: { storySlug: '$storySlug', chapterSlug: '$chapterSlug' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$storySlug', '$$storySlug'] },
                    { $eq: ['$slug', '$$chapterSlug'] },
                  ],
                },
              },
            },
            {
              $project: {
                slug: 1,
                title: 1,
                _id: 0,
              },
            },
          ],
          as: 'chapter',
        },
      },
      {
        $unwind: {
          path: '$chapter',
          preserveNullAndEmptyArrays: true,
        },
      }
    );
    return this;
  }
}

export { BookmarkPipelineBuilder };
