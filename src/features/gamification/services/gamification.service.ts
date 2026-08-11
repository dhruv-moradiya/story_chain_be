import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container/index.js';
import { BaseModule } from '@/utils/baseClass.js';
import { User } from '@models/user.model.js';
import { Story } from '@models/story.model.js';
import { ReadingHistory } from '@models/readingHistory.model.js';
import { XpTransactionRepository } from '@features/xpTransaction/repositories/xpTransaction.repository.js';
import { EventBusService } from '@infrastructure/events/event-bus.service.js';
import { NotificationService } from '@features/notification/services/notification.service.js';
import { APP_EVENTS } from '@infrastructure/events/event-bus.types.js';
import {
  XP_TIMING,
  XP_GUARDS,
  STORY_MILESTONE_THRESHOLDS,
  BadgeId,
  XpRewardReason,
  XpSourceType,
  calculateLevel,
  checkBadgeEligibility,
} from '@/constants/gamification.js';
import {
  IAwardXPInput,
  IAwardXPResult,
  IEvaluateMilestonesResult,
  IGamificationService,
} from '../types/gamification.types.js';

@singleton()
export class GamificationService extends BaseModule implements IGamificationService {
  constructor(
    @inject(TOKENS.XpTransactionRepository)
    private readonly xpTransactionRepository: XpTransactionRepository,
    @inject(TOKENS.EventBusService)
    private readonly eventBus: EventBusService,
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  /**
   * Awards XP to a user, logs transaction in XpTransaction collection,
   * updates user total XP, and recalculates level progression.
   */
  async awardXP(input: IAwardXPInput): Promise<IAwardXPResult> {
    const { userId, amount, reason, sourceId, sourceType } = input;

    const user = await User.findById(userId);
    if (!user) {
      this.throwNotFoundError('USER_NOT_FOUND', `User not found: ${userId}`);
    }

    // 1. Audit Transaction Log
    await this.xpTransactionRepository.createTransaction({
      userId,
      amount,
      reason,
      sourceId,
      sourceType,
      status: 'credited',
      creditedAt: new Date(),
    });

    // 2. XP & Level Recalculation
    const oldXP = user.xp || 0;
    const oldLevel = user.level || 1;
    const newTotalXP = Math.max(XP_GUARDS.MIN_XP_EVER, oldXP + amount);
    const newLevel = calculateLevel(newTotalXP);
    const levelUp = newLevel > oldLevel;

    // 3. Update User document
    await User.findByIdAndUpdate(userId, {
      $set: {
        xp: newTotalXP,
        level: newLevel,
      },
    });

    if (levelUp) {
      this.logInfo(`🎉 User ${userId} leveled up from Level ${oldLevel} to Level ${newLevel}!`);
      this.eventBus.emit(APP_EVENTS.USER_UPDATED, {
        userId,
        updatedFields: ['xp', 'level'],
      });
    }

    return {
      xpEarned: amount,
      newTotalXP,
      levelUp,
      oldLevel,
      newLevel,
    };
  }

  /**
   * Checks badge requirements and awards the badge atomically if eligible.
   */
  async checkAndAwardBadge(
    userId: string,
    badgeId: BadgeId,
    verifiedValue: number
  ): Promise<boolean> {
    const user = await User.findById(userId).select('badges');
    if (!user) return false;

    // Check if already earned
    if (user.badges && user.badges.includes(badgeId as any)) return false;

    // Verify threshold
    if (!checkBadgeEligibility(badgeId, verifiedValue)) return false;

    // Atomic update to avoid race conditions
    const updateResult = await User.updateOne(
      { _id: userId, badges: { $ne: badgeId } },
      { $addToSet: { badges: badgeId } }
    );

    if (updateResult.modifiedCount === 1) {
      this.logInfo(`🏅 Badge [${badgeId}] successfully awarded to user: ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Evaluates deferred Story Read Milestones for a story.
   * Specifically handles the milestone: Story reaches 100 unique reads in 30 days (+50 XP).
   * Also supports cumulative milestone stacking (1,000 reads & 10,000 reads).
   */
  async evaluateStoryReadMilestones(storySlug: string): Promise<IEvaluateMilestonesResult> {
    const story = await Story.findOne({ slug: storySlug });
    if (!story) {
      return { evaluated: false, uniqueReaders: 0, milestonesAwarded: [] };
    }

    // 1. Escrow Window Check: Story must be at least 48h old before milestones are awarded
    const now = Date.now();
    const publishedTime = story.publishedAt
      ? new Date(story.publishedAt).getTime()
      : new Date(story.createdAt).getTime();
    const storyAgeMs = now - publishedTime;

    if (storyAgeMs < XP_TIMING.STORY_ESCROW_MS) {
      this.logInfo(
        `[Gamification] Story "${storySlug}" is under 48h escrow window. Milestone evaluation deferred.`
      );
      return { evaluated: false, uniqueReaders: 0, milestonesAwarded: [] };
    }

    // 2. Count distinct unique readers from ReadingHistory
    const uniqueReaders = await ReadingHistory.countDocuments({ storySlug });
    const awardedMilestones: string[] = [];

    // 3. Evaluate Milestone 1: 100 Unique Reads (+50 XP)
    const m100 = STORY_MILESTONE_THRESHOLDS.READS_100;
    if (uniqueReaders >= m100.reads && !story.milestonesAwarded?.reads100) {
      const lockResult = await Story.updateOne(
        { _id: story._id, 'milestonesAwarded.reads100': { $ne: true } },
        { $set: { 'milestonesAwarded.reads100': true } }
      );

      if (lockResult.modifiedCount === 1) {
        this.logInfo(
          `🏆 Story "${storySlug}" reached ${uniqueReaders} unique reads! Awarding +${m100.xp} XP to creator ${story.creatorId}`
        );

        // Award +50 XP to creator
        await this.awardXP({
          userId: story.creatorId,
          amount: m100.xp,
          reason: XpRewardReason.STORY_MILESTONE_100_READS,
          sourceId: story.slug,
          sourceType: XpSourceType.STORY_MILESTONE,
        });

        awardedMilestones.push(m100.field);

        // Enqueue Milestone Notification
        await this.notificationService.enqueueStoryPublished({
          recipientUserIds: [story.creatorId],
          publisherName: 'Milestone Bot',
          storyName: story.title,
          storySlug: story.slug,
        });

        // Check STORY_STARTER badge (First story reaches 50+ unique readers)
        await this.checkAndAwardBadge(story.creatorId, 'STORY_STARTER', uniqueReaders);

        // Check PROLIFIC_CREATOR badge (5 different stories each reaching >= 100 reads)
        const storiesWith100Reads = await Story.countDocuments({
          creatorId: story.creatorId,
          'milestonesAwarded.reads100': true,
        });
        await this.checkAndAwardBadge(story.creatorId, 'PROLIFIC_CREATOR', storiesWith100Reads);
      }
    }

    // 4. Evaluate Milestone 2: 1,000 Unique Reads (+200 XP)
    const m1000 = STORY_MILESTONE_THRESHOLDS.READS_1000;
    if (uniqueReaders >= m1000.reads && !story.milestonesAwarded?.reads1000) {
      const lockResult = await Story.updateOne(
        { _id: story._id, 'milestonesAwarded.reads1000': { $ne: true } },
        { $set: { 'milestonesAwarded.reads1000': true } }
      );

      if (lockResult.modifiedCount === 1) {
        await this.awardXP({
          userId: story.creatorId,
          amount: m1000.xp,
          reason: XpRewardReason.STORY_MILESTONE_1000_READS,
          sourceId: story.slug,
          sourceType: XpSourceType.STORY_MILESTONE,
        });
        awardedMilestones.push(m1000.field);
      }
    }

    // 5. Evaluate Milestone 3: 10,000 Unique Reads (+1,000 XP)
    const m10000 = STORY_MILESTONE_THRESHOLDS.READS_10000;
    if (uniqueReaders >= m10000.reads && !story.milestonesAwarded?.reads10000) {
      const lockResult = await Story.updateOne(
        { _id: story._id, 'milestonesAwarded.reads10000': { $ne: true } },
        { $set: { 'milestonesAwarded.reads10000': true } }
      );

      if (lockResult.modifiedCount === 1) {
        await this.awardXP({
          userId: story.creatorId,
          amount: m10000.xp,
          reason: XpRewardReason.STORY_MILESTONE_10000_READS,
          sourceId: story.slug,
          sourceType: XpSourceType.STORY_MILESTONE,
        });
        awardedMilestones.push(m10000.field);

        // Check STORY_MASTER badge
        await this.checkAndAwardBadge(story.creatorId, 'STORY_MASTER', uniqueReaders);
      }
    }

    return {
      evaluated: true,
      uniqueReaders,
      milestonesAwarded: awardedMilestones,
    };
  }
}
