import {
  IAddCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { IComment } from '../../types/comment.types';
import { ICommentPaginatedResponse } from '@/types/response/comment.response.types';

interface ICommentCrudService {
  addComment(comment: IAddCommentDTO): Promise<IComment>;
  updateComment(comment: IUpdateCommentDTO): Promise<IComment | null>;
  deleteComment(comment: IDeleteCommentDTO): Promise<IComment | null>;
  getComment(comment: IGetCommentDTO): Promise<IComment | null>;
  getComments(comment: IGetCommentsDTO): Promise<ICommentPaginatedResponse>;
}

export type { ICommentCrudService };
