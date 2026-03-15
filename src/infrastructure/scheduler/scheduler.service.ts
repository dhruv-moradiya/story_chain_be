import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { QueueService } from '../queue/queue.service';
import {
  type TQueueName,
  type IQueueJobDataMap,
  type IScheduledJobOptions,
} from '../queue/queue.types';

/**
 * Registered scheduled job descriptor.
 * Use case: Track what cron jobs are active so we can list / remove them.
 */
interface IRegisteredJob {
  queueName: TQueueName;
  jobName: string;
  pattern: string;
  description: string;
}

/**
 * SchedulerService - Manages cron-based recurring jobs
 *
 * @description
 * A thin, type-safe layer on top of QueueService specifically for
 * repeatable / scheduled jobs. Keeps a registry of all registered
 * cron jobs for easy listing, removal, and health-checking.
 *
 * Use case: Register recurring background tasks at app startup, such as:
 * - Daily notification digests
 * - Periodic cache warm-up
 * - Stale draft cleanup
 *
 * @example
 * // Schedule a daily notification digest at midnight
 * await this.schedulerService.register({
 *   queueName: 'notification',
 *   jobName: 'daily-digest',
 *   description: 'Send daily notification digest emails',
 *   data: { userId: 'system', type: 'digest', title: 'Daily Digest', message: '' },
 *   schedule: { pattern: '0 0 * * *', timezone: 'Asia/Kolkata' },
 * });
 */
@singleton()
export class SchedulerService extends BaseModule {
  /** In-memory registry of all scheduled jobs */
  private readonly registeredJobs: IRegisteredJob[] = [];

  constructor(
    @inject(TOKENS.QueueService)
    private readonly queueService: QueueService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════

  /**
   * Register a new scheduled (cron) job.
   * Use case: Call once at startup to enqueue a repeatable job.
   * BullMQ de-duplicates by job name + cron pattern, so calling
   * this multiple times with the same args is safe.
   *
   * @param config - Fully typed configuration object for the scheduled job
   */
  async register<N extends TQueueName>(config: {
    queueName: N;
    jobName: string;
    description: string;
    data: IQueueJobDataMap[N];
    schedule: IScheduledJobOptions;
  }): Promise<void> {
    const { queueName, jobName, description, data, schedule } = config;

    await this.queueService.addScheduledJob(queueName, jobName, data, schedule);

    this.registeredJobs.push({
      queueName,
      jobName,
      pattern: schedule.pattern,
      description,
    });

    this.logInfo(`Scheduled job registered: "${jobName}" (${schedule.pattern}) — ${description}`);
  }

  // ═══════════════════════════════════════════
  // REMOVAL
  // ═══════════════════════════════════════════

  /**
   * Remove a previously registered scheduled job.
   * Use case: Dynamically disable a cron job (e.g. feature flag turned off).
   *
   * @param queueName - Queue the job lives on
   * @param jobName   - Name of the repeatable job
   * @param pattern   - Cron pattern it was registered with
   */
  async unregister(queueName: TQueueName, jobName: string, pattern: string): Promise<void> {
    await this.queueService.removeScheduledJob(queueName, jobName, pattern);

    const idx = this.registeredJobs.findIndex(
      (j) => j.queueName === queueName && j.jobName === jobName && j.pattern === pattern
    );
    if (idx !== -1) this.registeredJobs.splice(idx, 1);

    this.logInfo(`Scheduled job unregistered: "${jobName}" (${pattern})`);
  }

  // ═══════════════════════════════════════════
  // LISTING / HEALTH
  // ═══════════════════════════════════════════

  /**
   * List all currently registered scheduled jobs.
   * Use case: Admin endpoints or health-check dashboards that need
   * visibility into what recurring tasks are running.
   *
   * @returns Array of registered job descriptors
   */
  listRegistered(): ReadonlyArray<IRegisteredJob> {
    return this.registeredJobs;
  }

  /**
   * Get the count of registered scheduled jobs.
   * Use case: Quick sanity check at startup to verify all jobs registered.
   *
   * @returns Number of registered jobs
   */
  count(): number {
    return this.registeredJobs.length;
  }
}
