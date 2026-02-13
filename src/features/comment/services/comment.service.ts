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
import { CommentRepository } from '../repositories/comment.repository';
import { TOKENS } from '@/container';
import { sanitizeContent } from '@/utils/sanitizer';
import { ApiError } from '@/utils/apiResponse';

@singleton()
class CommentService extends BaseModule implements ICommentCrudService {
  constructor(
    @inject(TOKENS.CommentRepository) private readonly commentRepository: CommentRepository
  ) {
    super();
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

  getComments(_comment: IGetCommentsDTO): Promise<IComment[]> {
    return this.commentRepository.getComments(_comment);
  }
}

export { CommentService };
