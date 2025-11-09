import mongoose, { ClientSession } from 'mongoose';
import { logger } from './logger';

export async function withTransaction<T>(
  message: string,
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  session.startTransaction({
    maxCommitTimeMS: 30000,
  });

  try {
    logger.info(`🧩 [Transaction Start] ${message}`);

    const result = await fn(session);
    await session.commitTransaction();

    logger.info(`✅ [Transaction Committed] ${message}`);

    return result;
  } catch (error) {
    logger.error(`❌ [Transaction Aborted] ${message}`, error);

    await session.abortTransaction();

    throw error;
  } finally {
    session.endSession();
  }
}
