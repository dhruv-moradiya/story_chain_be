import { singleton } from 'tsyringe';
import { CommentVote } from '@/models/commentVote.model';
import { ICommentVote, ICommentVoteDoc } from '../types/commentVote.types';
import { BaseRepository } from '@/utils/baseClass';

@singleton()
export class CommentVoteRepository extends BaseRepository<ICommentVote, ICommentVoteDoc> {
  constructor() {
    super(CommentVote);
  }
}
