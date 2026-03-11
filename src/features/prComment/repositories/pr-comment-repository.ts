import { BaseRepository } from '@/utils/baseClass';
import { PRComment } from '@models/prComment.model';
import { singleton } from 'tsyringe';
import { IPRComment, IPRCommentDoc } from '../types/prComment.types';
import { ID } from '@/types';

@singleton()
class PrCommentRepository extends BaseRepository<IPRComment, IPRCommentDoc> {
  constructor() {
    super(PRComment);
  }

  async existsCommentById(_id: ID) {
    return await this.existsById({ filter: { _id } });
  }
}

export { PrCommentRepository };
