import { TOKENS } from '@/container';
import { logger } from '@/utils/logger';
import { container } from 'tsyringe';
import { QUEUE_NAMES, QueueService, WorkerService } from '.';
import { ChapterCommentVoteQueue } from '../domains/chapterCommentVote.queue';
import { commentVoteProcessor } from '../processors/commentVote.processors';
import { notificationProcessor } from '../processors/notification.processors';

export function bootstrapWorkers(): void {
  logger.info('[BOOTSTRAP-WORKERS]: 🚀 Bootstrapping workers');
  const workerService = container.resolve<WorkerService>(TOKENS.WorkerService);

  workerService.registerWorker(QUEUE_NAMES.CHAPTER_COMMENT_VOTE, commentVoteProcessor, 1);
  workerService.registerWorker(QUEUE_NAMES.NOTIFICATION, notificationProcessor, 1);
  // workerService.registerWorker(QUEUE_NAMES.FAKE_HEAVY, fakeHeavyProcessor, 10);
  logger.info('[BOOTSTRAP-WORKERS]: ✅ Workers bootstrapped');
}

export async function bootstrapSchedulers(): Promise<void> {
  logger.info('[BOOTSTRAP-SCHEDULERS]: ⏰ Bootstrapping schedulers');

  const voteQueue = container.resolve(ChapterCommentVoteQueue);
  await voteQueue.enqueueSyncCountsJob();

  // Enqueue fake heavy job running every 1 second (1000ms)
  const queueService = container.resolve<QueueService>(TOKENS.QueueService);
  await queueService.addScheduledJob(
    QUEUE_NAMES.FAKE_HEAVY,
    'fake-heavy-recurring-job',
    { timestamp: Date.now(), durationMs: 30000 },
    { every: 1000 }
  );

  logger.info('[BOOTSTRAP-SCHEDULERS]: ✅ Schedulers bootstrapped');
}
