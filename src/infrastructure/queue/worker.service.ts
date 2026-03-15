import { Worker, Job } from 'bullmq';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { RedisService } from '@/config/services';
import { BaseModule } from '@utils/baseClass';
import { type TQueueName, type IQueueJobDataMap, type IJobResult } from './queue.types';

/**
 * Processor function signature for a worker.
 * Each processor receives the strongly-typed job data and must return an IJobResult.
 */
type JobProcessor<N extends TQueueName> = (job: Job<IQueueJobDataMap[N]>) => Promise<IJobResult>;

/**
 * WorkerService - Type-safe BullMQ worker consumer
 *
 * @description
 * Creates and manages BullMQ workers that process jobs from queues.
 * Workers are registered with a strongly-typed processor function,
 * so the job data type is enforced at compile time.
 *
 * Use case: Register processors at application startup to handle
 * background jobs (e.g. send notification, send email).
 *
 * @example
 * // Register a notification worker
 * this.workerService.registerWorker('notification', async (job) => {
 *   const { userId, title, message } = job.data; // fully typed
 *   await this.notificationRepo.create({ userId, title, message });
 *   return { success: true, processedAt: new Date() };
 * });
 */
@singleton()
export class WorkerService extends BaseModule {
  /** Registry of active BullMQ Worker instances, keyed by queue name */
  private readonly workers = new Map<TQueueName, Worker>();

  constructor(
    @inject(TOKENS.RedisService)
    private readonly redisService: RedisService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // WORKER REGISTRATION
  // ═══════════════════════════════════════════

  /**
   * Register a worker that processes jobs from a specific queue.
   * Use case: Call this at app startup to attach a processor to each queue.
   * Only one worker per queue name is allowed to avoid duplicate processing.
   *
   * @param queueName  - Queue to consume from
   * @param processor  - Async function that processes each job
   * @param concurrency - Number of jobs to process in parallel (default: 1)
   */
  registerWorker<N extends TQueueName>(
    queueName: N,
    processor: JobProcessor<N>,
    concurrency: number = 1
  ): Worker {
    if (this.workers.has(queueName)) {
      this.logInfo(`Worker for "${queueName}" already registered, skipping`);
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.redisService.getClient().options,
      concurrency,
    });

    // ── Event listeners for observability ──
    worker.on('completed', (job: Job) => {
      this.logInfo(`Job "${job.name}" (id=${job.id}) completed on queue "${queueName}"`);
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logError(
        `Job "${job?.name}" (id=${job?.id}) failed on queue "${queueName}": ${error.message}`
      );
    });

    worker.on('error', (error: Error) => {
      this.logError(`Worker error on queue "${queueName}": ${error.message}`);
    });

    this.workers.set(queueName, worker);
    this.logInfo(`Worker registered for queue "${queueName}" (concurrency=${concurrency})`);

    return worker;
  }

  // ═══════════════════════════════════════════
  // WORKER STATUS
  // ═══════════════════════════════════════════

  /**
   * Check if a worker is currently running for a given queue.
   * Use case: Health-check endpoints or startup validation.
   *
   * @param queueName - Queue name to check
   * @returns true if a worker is registered and running
   */
  isRunning(queueName: TQueueName): boolean {
    return this.workers.has(queueName);
  }

  // ═══════════════════════════════════════════
  // GRACEFUL SHUTDOWN
  // ═══════════════════════════════════════════

  /**
   * Close all workers gracefully, waiting for in-progress jobs to finish.
   * Use case: Called during server shutdown to avoid interrupted jobs.
   */
  async closeAll(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logInfo(`Worker for queue "${name}" closed`);
    }
    this.workers.clear();
  }
}
