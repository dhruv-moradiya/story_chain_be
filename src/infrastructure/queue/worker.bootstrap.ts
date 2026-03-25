import { container } from 'tsyringe';
import { QUEUE_NAMES, WorkerService } from '.';
import { TOKENS } from '@/container';
import { commentVoteProcessor } from '../processors/commentVote.processors';
import { logger } from '@/utils/logger';
import { ChapterCommentVoteQueue } from '../domains/chapterCommentVote.queue';

export function bootstrapWorkers(): void {
  logger.info('[BOOTSTRAP-WORKERS]: 🚀 Bootstrapping workers');
  const workerService = container.resolve<WorkerService>(TOKENS.WorkerService);

  workerService.registerWorker(QUEUE_NAMES.CHAPTER_COMMENT_VOTE, commentVoteProcessor, 1);
  logger.info('[BOOTSTRAP-WORKERS]: ✅ Workers bootstrapped');
}

export async function bootstrapSchedulers(): Promise<void> {
  logger.info('[BOOTSTRAP-SCHEDULERS]: ⏰ Bootstrapping schedulers');

  const voteQueue = container.resolve(ChapterCommentVoteQueue);
  await voteQueue.enqueueSyncCountsJob();

  logger.info('[BOOTSTRAP-SCHEDULERS]: ✅ Schedulers bootstrapped');
}
