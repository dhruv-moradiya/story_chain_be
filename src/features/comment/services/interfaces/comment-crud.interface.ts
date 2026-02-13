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
  updateComment(comment: IUpdateCommentDTO): Promise<IComment>;
  deleteComment(comment: IDeleteCommentDTO): Promise<IComment>;
  getComment(comment: IGetCommentDTO): Promise<IComment>;
  getComments(comment: IGetCommentsDTO): Promise<IComment[]>;
}

export type { ICommentCrudService };
