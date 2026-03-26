import { Queue, JobsOptions } from 'bullmq';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@/config/services';
import { BaseModule } from '@utils/baseClass';
import {
  type TQueueName,
  type IQueueJobDataMap,
  type IAddJobOptions,
  type IScheduledJobOptions,
} from './queue.types';

/**
 * QueueService - Type-safe BullMQ queue producer
 *
 * @description
 * Manages BullMQ queues and provides a type-safe API for adding jobs.
 * Each queue name is mapped to its expected job data type via `IQueueJobDataMap`,
 * so the compiler catches payload mismatches at build time.
 *
 * Use case: Any service that needs to enqueue background work (notifications,
 * emails, data processing, etc.) should inject this class.
 *
 * @example
 * // Enqueue a notification job
 * await this.queueService.addJob('notification', 'send-collab-invite', {
 *   userId: 'user_123',
 *   type: 'collab_invitation',
 *   title: 'New Invitation',
 *   message: 'You have been invited to collaborate.',
 * });
 */
@singleton()
export class QueueService extends BaseModule {
  /** Registry of initialised BullMQ Queue instances, keyed by queue name */
  private readonly queues = new Map<TQueueName, Queue>();

  constructor(
    @inject(TOKENS.RedisService)
    private readonly redisService: RedisService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // QUEUE LIFECYCLE
  // ═══════════════════════════════════════════

  /**
   * Get or create a BullMQ Queue instance for the given queue name.
   * Use case: Lazily creates queues on first access so we don't open
   * connections for queues that are never used.
   *
   * @param name - Registered queue name from QUEUE_NAMES
   * @returns The BullMQ Queue instance
   */
  getQueue<N extends TQueueName>(name: N): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const queue = new Queue(name, {
      connection: this.redisService.getClient().options,
    });

    this.queues.set(name, queue);
    this.logInfo(`Queue "${name}" initialised`);
    return queue;
  }

  // ═══════════════════════════════════════════
  // JOB PRODUCERS
  // ═══════════════════════════════════════════

  /**
   * Add a single job to a queue with full type safety.
   * Use case: Enqueue any background task — the compiler ensures the
   * payload shape matches the queue name.
   *
   * @param queueName - Which queue to add the job to
   * @param jobName   - A descriptive name for the job (used in dashboards / logs)
   * @param data      - The job payload, type-checked against `IQueueJobDataMap`
   * @param options   - Optional scheduling / retry configuration
   */
  async addJob<N extends TQueueName>(
    queueName: N,
    jobName: string,
    data: IQueueJobDataMap[N],
    options?: IAddJobOptions
  ): Promise<string | undefined> {
    const queue = this.getQueue(queueName);

    const bullOptions: JobsOptions = {
      jobId: options?.jobId,
      delay: options?.delay,
      attempts: options?.attempts ?? 3,
      backoff: options?.backoff ?? { type: 'exponential', delay: 1000 },
      priority: options?.priority,
      removeOnComplete: options?.removeOnComplete ?? true,
      removeOnFail: options?.removeOnFail ?? false,
    };

    const job = await queue.add(jobName, data, bullOptions);
    this.logInfo(`Job "${jobName}" added to queue "${queueName}" with id=${job.id}`);
    return job.id;
  }

  /**
   * Add a repeatable / cron-based job to a queue.
   * Use case: Schedule recurring tasks such as daily digest emails,
   * weekly cleanup, or periodic cache warm-up.
   *
   * @param queueName - Which queue to add the scheduled job to
   * @param jobName   - A descriptive name (also acts as the repeatable key)
   * @param data      - The job payload
   * @param schedule  - Cron pattern and scheduling options
   */
  async addScheduledJob<N extends TQueueName>(
    queueName: N,
    jobName: string,
    data: IQueueJobDataMap[N],
    schedule: IScheduledJobOptions
  ): Promise<string | undefined> {
    const queue = this.getQueue(queueName);

    const job = await queue.add(jobName, data, {
      repeat: {
        pattern: schedule.pattern,
        tz: schedule.timezone,
        limit: schedule.limit,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      },
      removeOnComplete: true,
    });

    return job.id;
  }

  /**
   * Remove a repeatable job from a queue.
   * Use case: Unregister a cron job that is no longer needed
   * (e.g. feature flag toggled off).
   *
   * @param queueName - Queue the repeatable job lives on
   * @param jobName   - The repeatable job's name
   * @param pattern   - The cron pattern it was registered with
   */
  async removeScheduledJob(
    queueName: TQueueName,
    jobName: string,
    pattern: string
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);
    const removed = await queue.removeRepeatable(jobName, { pattern });
    this.logInfo(`Repeatable job "${jobName}" removed from queue "${queueName}": ${removed}`);
    return removed;
  }

  // ═══════════════════════════════════════════
  // GRACEFUL SHUTDOWN
  // ═══════════════════════════════════════════

  /**
   * Close all queue connections gracefully.
   * Use case: Called during server shutdown to release Redis connections.
   */
  async closeAll(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logInfo(`Queue "${name}" closed`);
    }
    this.queues.clear();
  }
}
