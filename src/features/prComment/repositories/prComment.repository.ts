import { singleton } from 'tsyringe';
import { PRComment } from '@models/prComment.model';
import { BaseRepository } from '@utils/baseClass';
import { IPRComment, IPRCommentDoc } from '@features/prComment/types/prComment.types';
import { IOperationOptions } from '@/types';
import { ID } from '@/types';

@singleton()
export class PRCommentRepository extends BaseRepository<IPRComment, IPRCommentDoc> {
  constructor() {
    super(PRComment);
  }

  findByPR(pullRequestId: ID, options: IOperationOptions = {}): Promise<IPRComment[]> {
    return this.find({
      filter: { pullRequestId },
      options,
    });
  }

  findTopLevelByPR(pullRequestId: ID, options: IOperationOptions = {}): Promise<IPRComment[]> {
    return this.find({
      filter: { pullRequestId, parentCommentId: null },
      options,
    });
  }

  findReplies(parentCommentId: ID, options: IOperationOptions = {}): Promise<IPRComment[]> {
    return this.find({
      filter: { parentCommentId },
      options,
    });
  }
}
