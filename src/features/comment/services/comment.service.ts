import { BaseModule } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { ICommentCrudService } from './interfaces/comment-crud.interface';
import {
  IAddCommentDTO,
  IDeleteCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { IComment } from '../types/comment.types';

@singleton()
class CommentService extends BaseModule implements ICommentCrudService {
  constructor() {
    super();
  }

  addComment(_comment: IAddCommentDTO): Promise<IComment> {
    throw new Error('Method not implemented.');
  }

  updateComment(_comment: IUpdateCommentDTO): Promise<IComment> {
    throw new Error('Method not implemented.');
  }

  deleteComment(_comment: IDeleteCommentDTO): Promise<IComment> {
    throw new Error('Method not implemented.');
  }

  getComment(_comment: IGetCommentDTO): Promise<IComment> {
    throw new Error('Method not implemented.');
  }

  getComments(_comment: IGetCommentsDTO): Promise<IComment[]> {
    throw new Error('Method not implemented.');
  }
}

export { CommentService };
