import { Job } from 'bullmq';
import { IFakeHeavyJobData, IJobResult } from '../queue/queue.types';
import { logger } from '@/utils/logger';

/**
 * fakeHeavyProcessor - Simulates a heavy background process taking time to execute.
 * Use case: Demonstrates queue execution under heavy load and event-loop impact.
 */
export async function fakeHeavyProcessor(
  job: Job<IFakeHeavyJobData, IJobResult>
): Promise<IJobResult> {
  const durationMs = job.data.durationMs || 30000;
  logger.info(
    `[FAKE-HEAVY-WORKER]: ⏳ Processing heavy fake job (Job ID: ${job.id}). Running for ${durationMs}ms...`
  );

  const startTime = Date.now();

  // 1. Simulate heavy CPU calculation
  let dummyCalculations = 0;
  // for (let i = 0; i < 5_000_000_000; i++) {
  //   dummyCalculations += Math.sqrt(i) * Math.sin(i);
  // }

  // 2. Simulate heavy asynchronous DB/API processing delay
  // await new Promise((resolve) => setTimeout(resolve, durationMs));

  const elapsed = Date.now() - startTime;
  logger.info(
    `[FAKE-HEAVY-WORKER]: ✅ Completed heavy fake job (Job ID: ${job.id}) in ${elapsed}ms`
  );

  return {
    success: true,
    processedAt: new Date(),
    message: `Fake heavy task completed in ${elapsed}ms (CPU calc sample: ${dummyCalculations.toFixed(2)})`,
  };
}
