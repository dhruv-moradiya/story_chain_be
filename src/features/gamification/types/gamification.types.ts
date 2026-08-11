import { BadgeId, XPRewardKey, XPSourceType } from '@/constants/gamification.js';

export interface IAwardXPInput {
  userId: string;
  amount: number;
  reason: XPRewardKey | string;
  sourceId?: string;
  sourceType?: XPSourceType | string;
}

export interface IAwardXPResult {
  xpEarned: number;
  newTotalXP: number;
  levelUp: boolean;
  oldLevel: number;
  newLevel: number;
}

export interface IEvaluateMilestonesResult {
  evaluated: boolean;
  uniqueReaders: number;
  milestonesAwarded: string[];
}

export interface IGamificationService {
  awardXP(input: IAwardXPInput): Promise<IAwardXPResult>;
  checkAndAwardBadge(userId: string, badgeId: BadgeId, verifiedValue: number): Promise<boolean>;
  evaluateStoryReadMilestones(storySlug: string): Promise<IEvaluateMilestonesResult>;
}
