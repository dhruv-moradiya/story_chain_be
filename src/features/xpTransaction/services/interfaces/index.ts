import { XPRewardKey } from '@/constants/gamification.js';

export interface IXpTransactionService {
  /**
   * Fetches the user's total global XP received across all credited transactions.
   */
  getUserGlobalXP(userId: string): Promise<number>;

  /**
   * Fetches total XP earned by a user for a specific "reason" during the current day (UTC start of day).
   */
  getDailyXPByReason(userId: string, reason: XPRewardKey | string, date?: Date): Promise<number>;

  /**
   * Fetches total XP earned by a user for a specific "reason" during the rolling week (last 7 days).
   */
  getWeeklyXPByReason(userId: string, reason: XPRewardKey | string, date?: Date): Promise<number>;
}
