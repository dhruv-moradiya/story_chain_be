import { TOKENS } from '@/container';
import { ICommentVoteDTO } from '@/dto/commentVote.dto';
import { CHAPTER_COMMENT_VOTE_JOB_NAMES, QUEUE_NAMES } from '@/infrastructure/queue/queue.types';
import { BaseModule } from '@/utils/baseClass';
import crypto from 'crypto';
import { inject, singleton } from 'tsyringe';
import { CRON, QueueService, SchedulerService } from '..';

@singleton()
export class ChapterCommentVoteQueue extends BaseModule {
  private readonly queueName = QUEUE_NAMES.CHAPTER_COMMENT_VOTE;

  constructor(
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService,

    @inject(TOKENS.SchedulerService)
    private readonly scheduler: SchedulerService
  ) {
    super();
  }

  async enqueueJob(input: ICommentVoteDTO) {
    await this.queueService.addJob(
      this.queueName,
      CHAPTER_COMMENT_VOTE_JOB_NAMES.VOTE,
      {
        commentId: input.commentId,
        userId: input.userId,
        voteType: input.voteType,
      },
      {
        jobId: crypto.randomUUID(),
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    this.logger.debug(`Vote job for comment ${input.commentId} enqueued`);
  }

  async enqueueRemoveVoteJob(input: { commentId: string; userId: string; voteId?: string }) {
    await this.queueService.addJob(
      this.queueName,
      CHAPTER_COMMENT_VOTE_JOB_NAMES.REMOVE_VOTE,
      {
        commentId: input.commentId,
        userId: input.userId,
        voteType: 'remove',
        voteId: input.voteId,
      },
      {
        jobId: crypto.randomUUID(),
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    this.logger.debug(`Remove vote job for comment ${input.commentId} enqueued`);
  }

  async enqueueSyncCountsJob() {
    this.scheduler.register({
      queueName: this.queueName,
      jobName: CHAPTER_COMMENT_VOTE_JOB_NAMES.SYNC_COUNTS,
      description: 'Syncs comment vote counts to database',
      data: { commentId: '__all__', userId: '', voteType: 'downvote' },
      schedule: { pattern: CRON.EVERY_MINUTE },
    });
  }
}
