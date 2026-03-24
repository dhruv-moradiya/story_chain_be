import { TOKENS } from '@/container';
import { ICommentVoteDTO } from '@/dto/commentVote.dto';
import { CommentService } from '@/features/comment/services/comment.service';
import { CommentVoteCacheService } from '@/infrastructure/cache/commentVoteCacheService';
import { ChapterCommentVoteQueue } from '@/infrastructure/domains/chapterCommentVote.queue';
import { IOperationOptions } from '@/types';
import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';

@singleton()
export class CommentVoteService extends BaseModule {
  constructor(
    @inject(TOKENS.CommentService) private readonly commentService: CommentService,
    @inject(TOKENS.CommentVoteCacheService)
    private readonly commentVoteCacheService: CommentVoteCacheService,
    @inject(TOKENS.ChapterCommentVoteQueue)
    private readonly chapterCommentVoteQueue: ChapterCommentVoteQueue
  ) {
    super();
  }

  async castVote(input: ICommentVoteDTO, _options: IOperationOptions = {}) {
    const { userId, commentId, voteType: vote } = input;

    const comment = await this.commentService.getComment({ commentId });
    if (!comment) this.throwNotFoundError('Comment not found.');

    const { previousVote } = await this.commentVoteCacheService.castVote(commentId, userId, vote);

    if (previousVote === vote) {
      // Idempotent — return current state without re-queuing
      const counts = await this.commentVoteCacheService.getCommentVoteCounts(commentId);
      return { counts, userVote: vote };
    }

    await this.chapterCommentVoteQueue.enqueueJob({
      commentId,
      userId,
      voteType: vote,
    });

    this.logger.debug(`Vote job for comment ${commentId} enqueued`);

    return { vote };
  }

  async removeVote(input: { commentId: string; userId: string }) {
    const { commentId, userId } = input;

    const comment = await this.commentService.getComment({ commentId });
    if (!comment) this.throwNotFoundError('Comment not found.');

    const { success } = await this.commentVoteCacheService.removeVote(commentId, userId);

    if (!success) {
      this.logger.debug(`No vote found to remove for comment ${commentId} and user ${userId}`);
      return { success: false };
    }

    await this.chapterCommentVoteQueue.enqueueRemoveVoteJob({ commentId, userId });

    this.logger.debug(`Remove vote job for comment ${commentId} enqueued`);

    return { success: true };
  }
}
