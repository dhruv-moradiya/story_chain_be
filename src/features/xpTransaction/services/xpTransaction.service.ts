import { BaseModule } from '@/utils/baseClass.js';
import { TOKENS } from '@/container/index.js';
import { inject, singleton } from 'tsyringe';
import { XpTransactionRepository } from '../repositories/xpTransaction.repository.js';
import { IXpTransactionService } from './interfaces/index.js';
import { XPRewardKey } from '@/constants/gamification.js';

@singleton()
export class XpTransactionService extends BaseModule implements IXpTransactionService {
  constructor(
    @inject(TOKENS.XpTransactionRepository)
    private readonly xpTransactionRepository: XpTransactionRepository
  ) {
    super();
  }

  /**
   * Fetches user's total global XP received across all credited transactions.
   */
  async getUserGlobalXP(userId: string): Promise<number> {
    if (!userId) {
      this.throwBadRequest('INVALID_USER_ID', 'User ID is required');
    }
    return this.xpTransactionRepository.sumUserXP(userId, { status: 'credited' });
  }

  /**
   * Fetches total XP earned by a user for a specific "reason" during the current day (UTC start of day).
   */
  async getDailyXPByReason(
    userId: string,
    reason: XPRewardKey | string,
    date: Date = new Date()
  ): Promise<number> {
    if (!userId) {
      this.throwBadRequest('INVALID_USER_ID', 'User ID is required');
    }
    if (!reason) {
      this.throwBadRequest('INVALID_REASON', 'Reason is required');
    }

    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
    );

    return this.xpTransactionRepository.sumXPByReason(userId, reason, startOfDay);
  }

  /**
   * Fetches total XP earned by a user for a specific "reason" during the week (rolling 7 days).
   */
  async getWeeklyXPByReason(
    userId: string,
    reason: XPRewardKey | string,
    date: Date = new Date()
  ): Promise<number> {
    if (!userId) {
      this.throwBadRequest('INVALID_USER_ID', 'User ID is required');
    }
    if (!reason) {
      this.throwBadRequest('INVALID_REASON', 'Reason is required');
    }

    const startOfWeek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.xpTransactionRepository.sumXPByReason(userId, reason, startOfWeek);
  }
}
