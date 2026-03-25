import { BasePipelineBuilder } from '@/shared/pipelines/base.pipeline.builder';
import { ID } from '@/types';
import { toId } from '@/utils';
import { IComment } from '../types/comment.types';
import { PUBLIC_USER_PROJECTION, attachUserStages } from '@/shared/pipelines';

class CommentPipelineBuilder extends BasePipelineBuilder<CommentPipelineBuilder> {
  /**
   * Matches a comment by its ID.
   */
  findById(commentId: ID) {
    this.pipeline.push({
      $match: {
        _id: toId(commentId),
      },
    });
    return this;
  }

  /**
   * Matches comments for a specific chapter.
   */
  byChapter(chapterSlug: string) {
    this.pipeline.push({
      $match: {
        chapterSlug,
      },
    });
    return this;
  }

  /**
   * Matches comments by a specific user.
   */
  byUser(userId: string) {
    this.pipeline.push({
      $match: {
        userId,
      },
    });
    return this;
  }

  /**
   * Filters only top-level comments (those without a parent).
   */
  filterTopLevel() {
    this.pipeline.push({
      $match: {
        parentCommentId: null,
      },
    });
    return this;
  }

  /**
   * Matches replies for a specific parent comment.
   */
  byParent(parentCommentId: ID) {
    this.pipeline.push({
      $match: {
        parentCommentId: toId(parentCommentId),
      },
    });
    return this;
  }

  /**
   * Filters out soft-deleted comments.
   */
  filterNotDeleted() {
    this.pipeline.push({
      $match: {
        isDeleted: false,
      },
    });
    return this;
  }

  /**
   * Attaches author details to each comment.
   */
  attachAuthor() {
    this.pipeline.push(
      ...attachUserStages({
        localField: 'userId',
        as: 'author',
        project: PUBLIC_USER_PROJECTION,
      })
    );
    return this;
  }

  /**
   * Attaches the vote type of the current user for each comment.
   */
  attachUserVote(userId?: string) {
    if (!userId) return this;

    this.pipeline.push(
      {
        $lookup: {
          from: 'commentvotes',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$commentId', '$$commentId'] }, { $eq: ['$userId', userId] }],
                },
              },
            },
            {
              $project: { _id: 0, voteType: 1 },
            },
          ],
          as: '_userVote',
        },
      },
      {
        $addFields: {
          currentUserVote: {
            $ifNull: [{ $arrayElemAt: ['$_userVote.voteType', 0] }, null],
          },
        },
      },
      {
        $unset: '_userVote',
      }
    );
    return this;
  }

  /**
   * Sorts comments by creation date (newest first by default).
   */
  sortByNewest() {
    this.pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
    return this;
  }

  /**
   * Removes unnecessary fields for the UI.
   */
  removeFields(fields: (keyof IComment)[]) {
    this.pipeline.push({
      $unset: fields,
    });
    return this;
  }

  // ==================== PRESETS ====================

  /**
   * Default preset for fetching comments in a list.
   */
  getCommentListPreset(userId?: string) {
    return this.filterNotDeleted().attachAuthor().attachUserVote(userId).sortByNewest();
  }

  /**
   * Preset for fetching comments of a specific chapter.
   */
  getChapterCommentsPreset(chapterSlug: string, userId?: string) {
    return this.byChapter(chapterSlug)
      .filterNotDeleted()
      .attachAuthor()
      .attachUserVote(userId)
      .sortByNewest();
  }
}

export { CommentPipelineBuilder };
