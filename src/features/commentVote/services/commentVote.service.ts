import { TOKENS } from '@/container';
import { ICommentVoteDTO } from '@/dto/commentVote.dto';
import { CommentService } from '@/features/comment/services/comment.service';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';
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
    @inject(TOKENS.CommentVoteRepository)
    private readonly commentVoteRepository: CommentVoteRepository,
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

    // 1. Determine existence (check cache for quick exit, but always consult DB for stable identity)
    const cacheVote = await this.commentVoteCacheService.getUserCommentVote(userId, commentId);
    const dbVote = await this.commentVoteRepository.getVote(commentId, userId);

    if (!dbVote) {
      if (cacheVote) {
        // Force sync: exists in cache but not DB
        await this.commentVoteCacheService.removeVote(commentId, userId);
      }
      this.logger.debug(
        `No vote found in cache or DB to remove for comment ${commentId} and user ${userId}`
      );
      return { success: false };
    }

    const voteId = String(dbVote._id);

    // 2. Schedule durable delete FIRST (ensuring persistence attempt with stable identity)
    await this.chapterCommentVoteQueue.enqueueRemoveVoteJob({ commentId, userId, voteId });

    // 3. Only after successful enqueue, invalidate cache
    await this.commentVoteCacheService.removeVote(commentId, userId);

    this.logger.debug(`Remove vote job for comment ${commentId} enqueued`);

    return { success: true };
  }
}
