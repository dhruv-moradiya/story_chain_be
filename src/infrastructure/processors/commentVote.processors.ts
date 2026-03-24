import { Job } from 'bullmq';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { CHAPTER_COMMENT_VOTE_JOB_NAMES, IChapterCommentVoteJobData } from '..';

import { logger } from '@/utils/logger';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';
import { CommentVoteCacheService } from '../cache/commentVoteCacheService';

export async function commentVoteProcessor(job: Job<IChapterCommentVoteJobData>) {
  const commentVoteRepository = container.resolve<CommentVoteRepository>(
    TOKENS.CommentVoteRepository
  );
  const commentVoteCacheService = container.resolve<CommentVoteCacheService>(
    TOKENS.CommentVoteCacheService
  );

  switch (job.name) {
    case CHAPTER_COMMENT_VOTE_JOB_NAMES.VOTE:
      logger.debug(`Processing vote job for comment ${job.data.commentId}`);

      await commentVoteRepository.upsertVote(
        job.data.commentId,
        job.data.userId,
        job.data.voteType
      );

      logger.debug(`Vote job for comment ${job.data.commentId} completed`);
      break;

    case CHAPTER_COMMENT_VOTE_JOB_NAMES.SYNC_COUNTS:
      await commentVoteCacheService.syncVoteCounts();

      break;
    default:
      throw new Error(`[CommentVoteWorker] Unknown job name: ${job.name}`);
  }

  return { success: true, processedAt: new Date() };
}
