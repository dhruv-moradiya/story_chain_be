import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import { IComment, ICommentDoc } from '../types/comment.types';
import { ICommentResponse } from '@/types/response/comment.response.types';
import { Comment } from '@/models/comment.model';
import {
  IAddCommentDTO,
  IGetCommentDTO,
  IGetCommentsDTO,
  IUpdateCommentDTO,
} from '@/dto/comments.dto';
import { FilterQuery } from 'mongoose';
import { IOperationOptions } from '@/types';
import { CommentPipelineBuilder } from '../pipelines/commentPipeline.builder';

@singleton()
class CommentRepository extends BaseRepository<IComment, ICommentDoc> {
  constructor() {
    super(Comment);
  }

  async getAllCommentIds(): Promise<string[]> {
    const ids = await this.model.find({}).select('_id').exec();
    return ids.map((id) => id._id.toString());
  }

  async addComment(comment: IAddCommentDTO): Promise<IComment> {
    return this.create({ data: comment });
  }

  async updateComment(comment: IUpdateCommentDTO): Promise<IComment | null> {
    return this.findOneAndUpdate({
      filter: { _id: comment.commentId, isDeleted: false },
      update: { content: comment.content, isEdited: true, editedAt: new Date() },
    });
  }

  async deleteComment(commentId: string): Promise<IComment | null> {
    // Soft delete
    return this.findOneAndUpdate({
      filter: { _id: commentId },
      update: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getComment(comment: IGetCommentDTO): Promise<IComment | null> {
    return this.findOne({ filter: { _id: comment.commentId } });
  }

  async getCommentById(commentId: string): Promise<IComment | null> {
    return this.findOne({ filter: { _id: commentId } });
  }

  async getComments(comment: IGetCommentsDTO): Promise<ICommentResponse[]> {
    const { chapterSlug, limit = 10, page = 1, parentCommentId, userId } = comment;

    const builder = new CommentPipelineBuilder()
      .getChapterCommentsPreset(chapterSlug, userId)
      .when(!!parentCommentId, (b: CommentPipelineBuilder) => b.byParent(parentCommentId!))
      .when(!parentCommentId, (b: CommentPipelineBuilder) => b.filterTopLevel())
      .paginate(page, limit);

    return this.model.aggregate<ICommentResponse>(builder.build()).exec();
  }

  async countComments(comment: Partial<IGetCommentsDTO>): Promise<number> {
    const { chapterSlug, parentCommentId } = comment;
    const query: FilterQuery<ICommentDoc> = { chapterSlug, isDeleted: false };

    if (parentCommentId) {
      query.parentCommentId = parentCommentId;
    } else {
      query.parentCommentId = null;
    }

    return this.model.countDocuments(query).exec();
  }

  async updateVoteCount(input: {
    commentId: string;
    voteType: 'upvote' | 'downvote';
    increment: number;
    options?: IOperationOptions;
  }) {
    const { commentId, voteType, increment, options = {} } = input;
    const field = voteType === 'upvote' ? 'votes.upvotes' : 'votes.downvotes';
    return this.model.updateOne(
      { _id: commentId },
      { $inc: { [field]: increment } },
      { session: options.session }
    );
  }

  async swapVoteCount(input: {
    commentId: string;
    decVoteType: 'upvote' | 'downvote';
    incVoteType: 'upvote' | 'downvote';
    options?: IOperationOptions;
  }) {
    const { commentId, decVoteType, incVoteType, options = {} } = input;
    const decField = decVoteType === 'upvote' ? 'votes.upvotes' : 'votes.downvotes';
    const incField = incVoteType === 'upvote' ? 'votes.upvotes' : 'votes.downvotes';
    return this.model.updateOne(
      { _id: commentId },
      { $inc: { [decField]: -1, [incField]: 1 } },
      { session: options.session }
    );
  }
}

export { CommentRepository };
