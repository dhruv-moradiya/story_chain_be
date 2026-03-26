import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ICommentCrudService } from './interfaces/comment-crud.interface';
import {
  IAddCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { IComment } from '../types/comment.types';
import {
  ICommentPaginatedResponse,
  ICommentResponse,
} from '@/types/response/comment.response.types';
import { CommentRepository } from '../repositories/comment.repository';
import { TOKENS } from '@/container';
import { sanitizeContent } from '@/utils/sanitizer';
import { ApiError } from '@/utils/apiResponse';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';

@singleton()
class CommentService extends BaseModule implements ICommentCrudService {
  constructor(
    @inject(TOKENS.CommentRepository) private readonly commentRepository: CommentRepository,
    @inject(TOKENS.CommentVoteRepository)
    private readonly commentVoteRepository: CommentVoteRepository
  ) {
    super();
  }

  async syncCounts(): Promise<void> {
    // 1. Get all votes counts from current vote records
    const counts = await this.commentVoteRepository.getAllCommentVoteCounts();
    const commentIdsWithVotes = counts.map((c) => c._id);

    // 2. Clear counts for comments that no longer have any votes (reconcile stale non-zero fields)
    await this.commentRepository.updateMany(
      {
        _id: { $nin: commentIdsWithVotes },
        $or: [{ 'votes.upvotes': { $ne: 0 } }, { 'votes.downvotes': { $ne: 0 } }],
      },
      {
        $set: {
          'votes.upvotes': 0,
          'votes.downvotes': 0,
        },
      }
    );

    if (!counts.length) return;

    // 3. Build bulk update operations for present counts
    const bulkOps = counts.map((c) => ({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            'votes.upvotes': c.up,
            'votes.downvotes': c.down,
          },
        },
      },
    }));

    // 4. Batch update current vote totals
    await this.commentRepository.bulkWrite(bulkOps);
  }

  addComment(input: IAddCommentDTO): Promise<IComment> {
    const sanitizedContent = sanitizeContent(input.content);
    return this.commentRepository.addComment({ ...input, content: sanitizedContent });
  }

  async updateComment(input: IUpdateCommentDTO & { userId: string }): Promise<IComment | null> {
    const comment = await this.commentRepository.getCommentById(input.commentId);
    if (!comment) {
      throw ApiError.notFound('COMMENT_NOT_FOUND', 'Comment not found');
    }

    if (comment.userId !== input.userId) {
      throw ApiError.forbidden('FORBIDDEN', 'You are not authorized to update this comment');
    }

    const sanitizedContent = sanitizeContent(input.content);
    return this.commentRepository.updateComment({ ...input, content: sanitizedContent });
  }

  async deleteComment(input: IDeleteCommentDTO & { userId: string }): Promise<IComment | null> {
    const comment = await this.commentRepository.getCommentById(input.commentId);
    if (!comment) {
      throw ApiError.notFound('COMMENT_NOT_FOUND', 'Comment not found');
    }

    if (comment.userId !== input.userId) {
      throw ApiError.forbidden('FORBIDDEN', 'You are not authorized to delete this comment');
    }

    // Repository expects just the ID now as string based on previous changes, let's check repo signature.
    // Repo signature: async deleteComment(commentId: string): Promise<IComment | null>
    return this.commentRepository.deleteComment(input.commentId);
  }

  getComment(_comment: IGetCommentDTO): Promise<IComment | null> {
    return this.commentRepository.getComment(_comment);
  }

  async getComments(comment: IGetCommentsDTO): Promise<ICommentPaginatedResponse> {
    const { page = 1, limit = 10 } = comment;

    const [docs, totalDocs] = await Promise.all([
      this.commentRepository.getComments(comment),
      this.commentRepository.countComments(comment),
    ]);

    return this.formatPaginatedResponse(docs, totalDocs, page, limit);
  }

  private formatPaginatedResponse(
    docs: ICommentResponse[],
    totalDocs: number,
    page: number,
    limit: number
  ): ICommentPaginatedResponse {
    const totalPages = Math.ceil(totalDocs / limit);
    const pagingCounter = (page - 1) * limit + 1;
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    const prevPage = hasPrevPage ? page - 1 : null;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter,
      hasPrevPage,
      hasNextPage,
      prevPage,
      nextPage,
    };
  }
}

export { CommentService };
