import { BaseRepository } from '@/utils/baseClass';
import { PRComment } from '@models/prComment.model';
import { singleton } from 'tsyringe';
import { IPRComment, IPRCommentDoc } from '../types/prComment.types';
import { ID } from '@/types';
import { IEditPrCommentDTO, IResolvePrCommentDTO } from '@/dto/pr-comment.dto';

@singleton()
class PrCommentRepository extends BaseRepository<IPRComment, IPRCommentDoc> {
  constructor() {
    super(PRComment);
  }

  async existsCommentById(_id: ID) {
    return await this.existsById({ filter: { _id } });
  }

  async editComment(input: IEditPrCommentDTO) {
    const { commentId, content, suggestion } = input;
    return await this.model.updateOne(
      { _id: commentId },
      {
        $set: {
          content,
          suggestion,
          isEdited: true,
          editedAt: new Date(),
        },
      }
    );
  }

  async resolveComment(input: IResolvePrCommentDTO) {
    const { commentId } = input;
    return await this.model.updateOne(
      { _id: commentId },
      {
        $set: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      }
    );
  }
}

export { PrCommentRepository };
