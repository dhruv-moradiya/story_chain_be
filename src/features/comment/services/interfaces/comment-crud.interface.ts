import {
  IAddCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { IComment } from '../../types/comment.types';

interface ICommentCrudService {
  addComment(comment: IAddCommentDTO): Promise<IComment>;
  updateComment(comment: IUpdateCommentDTO): Promise<IComment | null>;
  deleteComment(comment: IDeleteCommentDTO): Promise<IComment | null>;
  getComment(comment: IGetCommentDTO): Promise<IComment | null>;
  getComments(comment: IGetCommentsDTO): Promise<IComment[]>;
}

export type { ICommentCrudService };
