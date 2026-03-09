import { BaseRepository } from '@/utils/baseClass';
import { PRComment } from '@models/prComment.model';
import { singleton } from 'tsyringe';
import { IPRComment, IPRCommentDoc } from '../types/prComment.types';

@singleton()
class PrCommentRepository extends BaseRepository<IPRComment, IPRCommentDoc> {
  constructor() {
    super(PRComment);
  }
}

export { PrCommentRepository };
