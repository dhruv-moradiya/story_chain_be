import { Job } from 'bullmq';
import { container } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { CHAPTER_COMMENT_VOTE_JOB_NAMES, IChapterCommentVoteJobData, IJobResult } from '..';

import { logger } from '@/utils/logger';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';
import { CommentVoteCacheService } from '../cache/commentVoteCacheService';

export async function commentVoteProcessor(job: Job<IChapterCommentVoteJobData, IJobResult>) {
  const commentVoteRepository = container.resolve<CommentVoteRepository>(
    TOKENS.CommentVoteRepository
  );
  const commentVoteCacheService = container.resolve<CommentVoteCacheService>(
    TOKENS.CommentVoteCacheService
  );

  const { commentId, userId, voteType } = job.data;

  switch (job.name) {
    case CHAPTER_COMMENT_VOTE_JOB_NAMES.VOTE:
      logger.debug(`Processing vote job for comment ${commentId}`);

      if (voteType !== 'remove') {
        await commentVoteRepository.upsertVote(commentId, userId, voteType);
      }

      logger.debug(`Vote job for comment ${commentId} completed`);
      break;

    case CHAPTER_COMMENT_VOTE_JOB_NAMES.REMOVE_VOTE:
      logger.debug(`Processing remove vote job for comment ${commentId}`);

      await commentVoteRepository.removeVote(commentId, userId);

      logger.debug(`Remove vote job for comment ${commentId} completed`);
      break;

    case CHAPTER_COMMENT_VOTE_JOB_NAMES.SYNC_COUNTS:
      await commentVoteCacheService.syncVoteCounts();

      break;
    default:
      throw new Error(`[CommentVoteWorker] Unknown job name: ${job.name}`);
  }

  return { success: true, processedAt: new Date() };
}
