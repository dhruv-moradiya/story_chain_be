import { Job } from 'bullmq';
import { container } from 'tsyringe';
import mongoose from 'mongoose';

import { TOKENS } from '@container/tokens';
import {
  CHAPTER_COMMENT_VOTE_JOB_NAMES,
  IChapterCommentVoteJobData,
  IChapterCommentVoteJobDataMap,
  IJobResult,
} from '..';

import { logger } from '@/utils/logger';
import { CommentVoteRepository } from '@/features/commentVote/repository/commentVote.repository';
import { CommentVoteCacheService } from '../cache/commentVoteCacheService';
import { CommentRepository } from '@/features/comment/repositories/comment.repository';

export async function commentVoteProcessor(
  job: Job<IChapterCommentVoteJobData, IJobResult>
): Promise<IJobResult> {
  const commentVoteRepository = container.resolve<CommentVoteRepository>(
    TOKENS.CommentVoteRepository
  );
  const commentRepository = container.resolve<CommentRepository>(TOKENS.CommentRepository);
  const commentVoteCacheService = container.resolve<CommentVoteCacheService>(
    TOKENS.CommentVoteCacheService
  );

  if (job.name === CHAPTER_COMMENT_VOTE_JOB_NAMES.SYNC_COUNTS) {
    await commentVoteCacheService.syncVoteCounts();
    return { success: true, processedAt: new Date() };
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      switch (job.name) {
        case CHAPTER_COMMENT_VOTE_JOB_NAMES.VOTE: {
          const { commentId, userId, voteType } = job.data;
          if (voteType === 'remove') {
            logger.warn(
              `[CommentVoteWorker] Unexpected 'remove' voteType in VOTE job for comment ${commentId}`
            );
            return;
          }

          const oldVote = await commentVoteRepository.upsertVote(commentId, userId, voteType, {
            session,
          });

          // 🧠 Handle vote changes efficiently
          if (!oldVote) {
            // New vote
            await commentRepository.updateVoteCount({
              commentId,
              voteType,
              increment: 1,
              options: { session },
            });
            return;
          }

          if (oldVote.voteType !== voteType) {
            await commentRepository.swapVoteCount({
              commentId,
              decVoteType: oldVote.voteType,
              incVoteType: voteType,
              options: { session },
            });
          }

          return;
        }

        case CHAPTER_COMMENT_VOTE_JOB_NAMES.REMOVE_VOTE: {
          const { commentId, userId, voteId } =
            job.data as IChapterCommentVoteJobDataMap[typeof CHAPTER_COMMENT_VOTE_JOB_NAMES.REMOVE_VOTE];
          const deletedVote = await commentVoteRepository.removeVote(
            commentId,
            userId,
            { _id: voteId },
            { session }
          );

          if (!deletedVote) {
            logger.debug(
              `[CommentVoteWorker] No matching vote found to remove for comment ${commentId} and user ${userId}`
            );
            return;
          }

          await commentRepository.updateVoteCount({
            commentId,
            voteType: deletedVote.voteType,
            increment: -1,
            options: { session },
          });

          return;
        }

        default:
          throw new Error(`[CommentVoteWorker] Unknown job name: ${job.name}`);
      }
    });

    logger.debug(`[CommentVoteWorker] Job ${job.name} completed for comment ${job.data.commentId}`);

    return { success: true, processedAt: new Date() };
  } catch (error) {
    logger.error(`[CommentVoteWorker] Failed job ${job.id}:`, error);
    throw error;
  } finally {
    await session.endSession();
  }
}
