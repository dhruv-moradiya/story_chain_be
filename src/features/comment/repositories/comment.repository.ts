import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IComment, ICommentDoc } from '../types/comment.types';
import { Comment } from '@/models/comment.model';
import {
  IAddCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { FilterQuery } from 'mongoose';

@singleton()
class CommentRepository extends BaseRepository<IComment, ICommentDoc> {
  constructor() {
    super(Comment);
  }

  async addComment(comment: IAddCommentDTO): Promise<IComment> {
    return this.create(comment);
  }

  async updateComment(comment: IUpdateCommentDTO): Promise<IComment | null> {
    return this.findOneAndUpdate(
      { _id: comment.commentId, isDeleted: false },
      { content: comment.content, isEdited: true, editedAt: new Date() }
    );
  }

  async deleteComment(commentId: string): Promise<IComment | null> {
    // Soft delete
    return this.findOneAndUpdate({ _id: commentId }, { isDeleted: true, deletedAt: new Date() });
  }

  async getComment(comment: IGetCommentDTO): Promise<IComment | null> {
    return this.findOne({ _id: comment.commentId });
  }

  async getCommentById(commentId: string): Promise<IComment | null> {
    return this.findOne({ _id: commentId });
  }

  async getComments(comment: IGetCommentsDTO): Promise<IComment[]> {
    const { chapterSlug, limit = 10, cursor, parentCommentId } = comment;
    const query: FilterQuery<ICommentDoc> = { chapterSlug, isDeleted: false }; // We might want to see deleted flag in UI? Plan said "Normal GET should not return it". So this is correct.

    if (parentCommentId) {
      query.parentCommentId = parentCommentId;
    } else {
      // Fetch top-level comments if parentCommentId is not specified
      query.parentCommentId = null;
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    // Use this.model to access Mongoose features directly if needed, or this.find if base wrapper supports it sufficienty.
    // BaseRepository.find usually returns Promise<T[]>.
    // To support limit and sort, we might need to use this.model directly as shown in previous step.
    return this.model.find(query).sort({ createdAt: -1 }).limit(limit).exec();
  }
}

export { CommentRepository };
