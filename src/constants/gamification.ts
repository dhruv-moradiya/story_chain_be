// ============================================================
// STORYCHAIN — GAMIFICATION CONSTANTS
// Single source of truth for XP, Levels, Badges, Caps, Timing
// ============================================================

// ============================================================
// SECTION 1: XP REWARDS
// The raw XP amount for each action BEFORE caps/multipliers.
// "Instant"  → credited the moment the action happens.
// "Deferred" → held until the validation window passes (see XP_TIMING).
// ============================================================
export const XP_REWARDS = {
  // ----- STORY MILESTONES (Deferred) -----
  // Awarded once per story, per tier, as unique reads accumulate.
  // Milestones STACK: a story hitting 10,000 reads earns ALL three = 1,250 XP.
  STORY_MILESTONE_100_READS: 50,
  STORY_MILESTONE_1000_READS: 200,
  STORY_MILESTONE_10000_READS: 1000,

  // ----- CHAPTER REWARDS (Deferred) -----
  // Base survival bonus — before diminishing returns multiplier is applied.
  CHAPTER_SURVIVAL_BASE: 15, // Chapter survives 7 days unflagged + ≥5 unique reads
  CHAPTER_SCORE_BONUS_10: 20, // Chapter reaches net vote score ≥ 10 (sustained 24h)
  CHAPTER_SCORE_BONUS_50: 50, // Chapter reaches net vote score ≥ 50 (sustained 24h)

  // ----- CHAPTER VOTES (Instant) -----
  // Goes to the chapter AUTHOR, not the voter.
  CHAPTER_UPVOTED: 1, // Someone upvotes your chapter
  CHAPTER_DOWNVOTED: -1, // Someone downvotes your chapter (min 0 total ever)

  // ----- PULL REQUEST (Instant on event) -----
  PR_SUBMITTED: 0, // Submitting a PR earns nothing — quality must prove itself
  PR_APPROVED: 40, // PR merged/approved by story owner
  PR_REJECTED: -5, // Discourages spam submissions; min 0 total ever

  // ----- PR REVIEWS (Instant) -----
  REVIEW_PR: 10, // Completing a PR review (as collaborator/reviewer role)

  // ----- COMMENTS (Instant) -----
  // Goes to the commenter.
  COMMENT_SHORT: 2, // Comment is 20–99 characters
  COMMENT_LONG: 5, // Comment is 100+ characters (same daily cap bucket)
  // Goes to the content OWNER (author of the chapter/story being commented on).
  RECEIVE_COMMENT: 3,

  // ----- FOLLOWS (Instant) -----
  FOLLOW_USER: 0, // Following someone earns nothing for the follower
  GET_FOLLOWED: 5, // Someone new follows you

  // ----- MODERATION (Deferred) -----
  VALID_REPORT: 5, // Your report is confirmed valid by a moderator

  // ----- PENALTIES -----
  // Applied on top of the above negatives for confirmed abuse.
  STORY_SPAM_PENALTY: -30, // Story confirmed spam/empty by moderator
  CHAPTER_SPAM_PENALTY: -20, // Chapter deleted by moderator for spam/violation
} as const;

export type XPRewardKey = keyof typeof XP_REWARDS;

// ============================================================
// SECTION 2: XP TIMING
// How long to wait before a Deferred XP is evaluated/credited.
// All values are in MILLISECONDS for BullMQ job delays.
// ============================================================
export const XP_TIMING = {
  // Instant actions — no delay (0ms)
  INSTANT: 0,

  // Story milestone check fires as soon as reads update in the BullMQ job.
  // The 48h escrow is the MINIMUM story age before any milestone is eligible.
  STORY_ESCROW_MS: 48 * 60 * 60 * 1000, // 48 hours

  // Chapter survival check — job is scheduled 7 days after chapter publish.
  CHAPTER_SURVIVAL_DELAY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Chapter score bonus — score must be sustained for 24h before bonus is awarded.
  CHAPTER_SCORE_SUSTAIN_MS: 24 * 60 * 60 * 1000, // 24 hours

  // PR approval — PR must have been open for at least 1 hour before approval XP counts.
  // This prevents instant self-approve loops.
  PR_MIN_OPEN_MS: 1 * 60 * 60 * 1000, // 1 hour

  // Valid report reward — credited after moderator confirms the report.
  VALID_REPORT_DELAY_MS: 0, // Immediate on moderator action
} as const;

// Human-readable labels for logging / notifications
export const XP_TIMING_LABELS: Record<keyof typeof XP_TIMING, string> = {
  INSTANT: 'Instant',
  STORY_ESCROW_MS: '48 hours (story escrow)',
  CHAPTER_SURVIVAL_DELAY_MS: '7 days (chapter survival window)',
  CHAPTER_SCORE_SUSTAIN_MS: '24 hours (score sustain check)',
  PR_MIN_OPEN_MS: '1 hour (PR minimum open time)',
  VALID_REPORT_DELAY_MS: 'Instant (on moderator confirmation)',
};

// ============================================================
// SECTION 3: DAILY XP CAPS
// Maximum XP a user can earn from each SOURCE CATEGORY per day.
// Tracked via XpTransaction collection (reason + createdAt index).
// The GLOBAL cap is the hard ceiling across ALL categories.
// ============================================================
export const XP_DAILY_CAPS = {
  // Hard ceiling — no matter what, you can't earn more than this in 24h.
  GLOBAL: 150,

  // From chapter upvotes received on your chapters.
  FROM_CHAPTER_UPVOTES: 20, // = 20 upvotes × 1 XP each

  // From comments you write (both COMMENT_SHORT and COMMENT_LONG share this bucket).
  FROM_COMMENTS_WRITTEN: 10, // = 5 quality comments per day max

  // From comments others leave on your content.
  FROM_COMMENTS_RECEIVED: 30, // = 10 received comments × 3 XP each

  // From reviewing PRs (REVIEW_PR).
  FROM_PR_REVIEWS: 30, // = 3 reviews × 10 XP each (hard max 3/day)
} as const;

// ============================================================
// SECTION 4: WEEKLY XP CAPS
// Maximum XP a user can earn from each SOURCE CATEGORY per rolling 7-day window.
// ============================================================
export const XP_WEEKLY_CAPS = {
  // From chapter survival bonus (CHAPTER_SURVIVAL_BASE × diminishing multiplier).
  FROM_CHAPTER_SURVIVAL: 100,

  // From PR approvals received (PR_APPROVED).
  FROM_PR_APPROVALS: 200, // = 5 approved PRs × 40 XP each

  // From new followers (GET_FOLLOWED).
  FROM_FOLLOWS: 50, // = 10 new followers × 5 XP each

  // From chapter upvotes received (rolled up from daily).
  FROM_CHAPTER_UPVOTES: 100,

  // From comments written (rolled up from daily).
  FROM_COMMENTS_WRITTEN: 50,

  // From comments received (rolled up from daily).
  FROM_COMMENTS_RECEIVED: 150,

  // From PR reviews done (rolled up from daily).
  FROM_PR_REVIEWS: 100,
} as const;

// ============================================================
// SECTION 5: DAILY ACTION COUNTS (Hard Rate Limits)
// Maximum number of TIMES an action can contribute to XP per day.
// Even if the XP cap isn't hit, these count-based gates apply.
// ============================================================
export const XP_DAILY_ACTION_LIMITS = {
  // Max number of PR reviews that earn XP per day.
  PR_REVIEWS_PER_DAY: 3,

  // Max number of comments that earn XP per day.
  COMMENTS_PER_DAY: 5,
} as const;

// ============================================================
// SECTION 6: XP QUALITY GATES
// Minimum thresholds a piece of content must meet before any XP is evaluated.
// These are the "proof of value" gates that block spam.
// ============================================================
export const XP_QUALITY_GATES = {
  STORY: {
    // Minimum unique readers before any XP milestone is triggered.
    // (Milestone 1 threshold: 100 reads. This gate is just for the escrow check.)
    ESCROW_MIN_AGE_MS: XP_TIMING.STORY_ESCROW_MS, // Story must be ≥ 48h old

    // Reads counted only from readingHistory.qualifyingRead === true entries.
    // Deduplication by userId (logged-in) or IP hash (guest).
    USE_QUALIFYING_READS_ONLY: true,
  },

  CHAPTER: {
    // Minimum unique readers for the 7-day survival bonus to be awarded.
    MIN_UNIQUE_READS: 5,

    // Chapter must NOT be flagged or deleted when the 7-day job fires.
    MUST_BE_UNFLAGGED: true,

    // For the net-score bonus, score must be sustained for this long.
    SCORE_SUSTAIN_MS: XP_TIMING.CHAPTER_SCORE_SUSTAIN_MS,

    // Minimum net score to trigger CHAPTER_SCORE_BONUS_10.
    MIN_NET_SCORE_FOR_BONUS_10: 10,

    // Minimum net score to trigger CHAPTER_SCORE_BONUS_50.
    MIN_NET_SCORE_FOR_BONUS_50: 50,
  },

  COMMENT: {
    // Comment must be at least this many characters to earn ANY XP.
    MIN_LENGTH_FOR_XP: 20,

    // Comment must be at least this many characters to earn COMMENT_LONG XP.
    LONG_COMMENT_MIN_LENGTH: 100,
  },

  PR: {
    // PR must have been open for at least this long before approval XP is credited.
    MIN_OPEN_MS: XP_TIMING.PR_MIN_OPEN_MS,
  },
} as const;

// ============================================================
// SECTION 7: DIMINISHING RETURNS
// Applied to CHAPTER_SURVIVAL_BASE within a rolling 7-day window.
// countThisWeek = number of chapters already credited this week.
// Formula: XP = CHAPTER_SURVIVAL_BASE × multiplier (rounded down).
//
//   1st chapter:  15 × 1.0 = 15 XP
//   2nd chapter:  15 × 0.7 = 10 XP
//   3rd chapter:  15 × 0.4 =  6 XP
//   4th chapter:  15 × 0.2 =  3 XP
//   5th+ chapter: 15 × 0.0 =  0 XP  ← spam wall
// ============================================================
export const XP_DIMINISHING_RETURNS = {
  CHAPTER_SURVIVAL: [
    { countThisWeek: 0, multiplier: 1.0 },
    { countThisWeek: 1, multiplier: 0.7 },
    { countThisWeek: 2, multiplier: 0.4 },
    { countThisWeek: 3, multiplier: 0.2 },
    { countThisWeek: 4, multiplier: 0.0 }, // 5th and beyond: 0 XP
  ],
} as const;

// Helper: get the diminishing returns multiplier for a chapter
export function getChapterSurvivalMultiplier(chaptersAlreadyCreditedThisWeek: number): number {
  const entry = XP_DIMINISHING_RETURNS.CHAPTER_SURVIVAL.find(
    (e) => e.countThisWeek === chaptersAlreadyCreditedThisWeek
  );
  // If count exceeds defined entries, multiplier is 0
  return entry?.multiplier ?? 0;
}

// Helper: calculate final chapter survival XP after diminishing returns
export function calculateChapterSurvivalXP(chaptersAlreadyCreditedThisWeek: number): number {
  const multiplier = getChapterSurvivalMultiplier(chaptersAlreadyCreditedThisWeek);
  return Math.floor(XP_REWARDS.CHAPTER_SURVIVAL_BASE * multiplier);
}

// ============================================================
// SECTION 8: ABSOLUTE XP GUARDS
// These never change regardless of other rules.
// ============================================================
export const XP_GUARDS = {
  // user.xp can NEVER go below this value.
  MIN_XP_EVER: 0,

  // Maximum XP that can be awarded in a single transaction.
  // Safety net against code bugs producing huge one-off awards.
  MAX_SINGLE_TRANSACTION: 1000, // Matches STORY_MILESTONE_10000_READS
} as const;

// ============================================================
// SECTION 9: LEVEL THRESHOLDS
// calculateLevel(), getLevelTitle(), getXPForNextLevel() helpers below.
// ============================================================
export const LEVEL_THRESHOLDS = [
  { level: 1, minXP: 0, maxXP: 99, title: 'Beginner' },
  { level: 2, minXP: 100, maxXP: 299, title: 'Writer' },
  { level: 3, minXP: 300, maxXP: 599, title: 'Author' },
  { level: 4, minXP: 600, maxXP: 999, title: 'Storyteller' },
  { level: 5, minXP: 1000, maxXP: 1999, title: 'Master' },
  { level: 6, minXP: 2000, maxXP: 3499, title: 'Wordsmith' },
  { level: 7, minXP: 3500, maxXP: 5499, title: 'Legendary Author' },
  { level: 8, minXP: 5500, maxXP: 8499, title: 'Epic Narrator' },
  { level: 9, minXP: 8500, maxXP: 12499, title: 'Mythweaver' },
  { level: 10, minXP: 12500, maxXP: Infinity, title: 'Grandmaster' },
] as const;

export function calculateLevel(xp: number): number {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.minXP && xp <= threshold.maxXP) {
      return threshold.level;
    }
  }
  return 1;
}

export function getLevelTitle(level: number): string {
  const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  return threshold?.title ?? 'Beginner';
}

export function getXPForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevelThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return nextLevelThreshold ? nextLevelThreshold.minXP - currentXP : 0;
}

// ============================================================
// SECTION 10: BADGE DEFINITIONS
// ============================================================
export const BADGES = {
  // Story — community-validated (real readers required)
  STORY_STARTER: {
    id: 'STORY_STARTER',
    name: 'Story Starter',
    description: 'Your first story reached 50 unique readers',
    icon: '📖',
    threshold: 50, // distinctReaders on any single story
  },
  PROLIFIC_CREATOR: {
    id: 'PROLIFIC_CREATOR',
    name: 'Prolific Creator',
    description: '5 different stories each reached 100 unique readers',
    icon: '📚',
    threshold: 5, // count of stories with distinctReaders >= 100
  },
  STORY_MASTER: {
    id: 'STORY_MASTER',
    name: 'Story Master',
    description: 'One of your stories reached 10,000 unique readers',
    icon: '🏆',
    threshold: 10000, // distinctReaders on any single story
  },

  // Chapter — score-validated
  BRANCH_CREATOR: {
    id: 'BRANCH_CREATOR',
    name: 'Branch Creator',
    description: '10 of your branch chapters each have a net vote score ≥ 5',
    icon: '🌿',
    threshold: 10, // count of branches with net_score >= 5
  },
  TOP_CONTRIBUTOR: {
    id: 'TOP_CONTRIBUTOR',
    name: 'Top Contributor',
    description: '25 of your chapters each have ≥ 5 unique readers',
    icon: '✍️',
    threshold: 25, // count of chapters with uniqueReaders >= 5
  },

  // Quality — hardest to fake
  MOST_UPVOTED: {
    id: 'MOST_UPVOTED',
    name: 'Most Upvoted',
    description: 'A single chapter of yours reached 100 upvotes with net score ≥ 80',
    icon: '👍',
    threshold: 100, // upvotes on single chapter; net_score >= 80 also required
  },
  TRENDING_AUTHOR: {
    id: 'TRENDING_AUTHOR',
    name: 'Trending Author',
    description: 'One of your stories appeared in the platform top 10 trending',
    icon: '🔥',
    threshold: 1, // times appeared in trending top 10
  },
  COMMUNITY_FAVORITE: {
    id: 'COMMUNITY_FAVORITE',
    name: 'Community Favorite',
    description: 'You have received 1,000+ total upvotes across all your chapters (net positive)',
    icon: '⭐',
    threshold: 1000, // user.stats.totalUpvotes, net positive required
  },

  // Collaboration — PR-gated
  COLLABORATIVE: {
    id: 'COLLABORATIVE',
    name: 'Collaborative',
    description: '10 of your PRs were approved across at least 5 different stories',
    icon: '🤝',
    threshold: 10, // approved PRs on distinct stories (min 5 different stories)
  },
  QUALITY_CURATOR: {
    id: 'QUALITY_CURATOR',
    name: 'Quality Curator',
    description: '10 approved PRs with an approval rate of 70% or higher',
    icon: '✅',
    threshold: 10, // approved PR count; approval rate >= 70% also required
  },

  // Longevity — time-gated
  VETERAN_WRITER: {
    id: 'VETERAN_WRITER',
    name: 'Veteran Writer',
    description: 'Account is 1 year old and you earned ≥ 50 XP in the last 30 days',
    icon: '🗓️',
    threshold: 365, // account age in days; recentXP >= 50 also required
  },
} as const;

export type BadgeId = keyof typeof BADGES;

export function checkBadgeEligibility(badgeId: BadgeId, value: number): boolean {
  return value >= BADGES[badgeId].threshold;
}

// Badge grouping for frontend display
export const BADGE_CATEGORY = {
  STORY: ['STORY_STARTER', 'PROLIFIC_CREATOR', 'STORY_MASTER'],
  CHAPTER: ['BRANCH_CREATOR', 'TOP_CONTRIBUTOR'],
  QUALITY: ['MOST_UPVOTED', 'TRENDING_AUTHOR', 'COMMUNITY_FAVORITE'],
  COLLABORATION: ['COLLABORATIVE', 'QUALITY_CURATOR'],
  COMMUNITY: ['VETERAN_WRITER'],
} as const satisfies Record<string, readonly BadgeId[]>;

// ============================================================
// SECTION 11: STORY MILESTONE READ THRESHOLDS
// The exact read counts that trigger each XP milestone.
// Stored separately so the BullMQ job can reference them cleanly.
// ============================================================
export const STORY_MILESTONE_THRESHOLDS = {
  READS_100: { reads: 100, xp: XP_REWARDS.STORY_MILESTONE_100_READS, field: 'reads100' },
  READS_1000: { reads: 1000, xp: XP_REWARDS.STORY_MILESTONE_1000_READS, field: 'reads1000' },
  READS_10000: { reads: 10000, xp: XP_REWARDS.STORY_MILESTONE_10000_READS, field: 'reads10000' },
} as const;

// ============================================================
// SECTION 12: GAMIFICATION JOB NAMES (BullMQ queue event keys)
// ============================================================
export const GAMIFICATION_JOBS = {
  // Fired immediately when a qualifying read is recorded on a story.
  STORY_MILESTONE_CHECK: 'gamification.story-milestone-check',

  // Fired with a 7-day delay when a chapter is published.
  CHAPTER_XP_CHECK: 'gamification.chapter-xp-check',

  // Fired with a 24-hour delay when a chapter's net score crosses a bonus threshold.
  CHAPTER_SCORE_BONUS_CHECK: 'gamification.chapter-score-bonus-check',

  // Daily cron — checks VETERAN_WRITER badge eligibility.
  VETERAN_BADGE_CHECK: 'gamification.veteran-badge-check',

  // Internal events (not BullMQ jobs — used for in-process notifications).
  XP_AWARDED: 'gamification.xp-awarded',
  LEVEL_UP: 'gamification.level-up',
  BADGE_EARNED: 'gamification.badge-earned',
} as const;

// ============================================================
// SECTION 13: XP SOURCE TYPES (used in XpTransaction.sourceType)
// ============================================================
export const XP_SOURCE_TYPES = [
  'story_milestone',
  'chapter_survival',
  'chapter_score_bonus',
  'chapter_vote',
  'pr_approved',
  'pr_rejected',
  'pr_review',
  'comment_written',
  'comment_received',
  'follow_received',
  'valid_report',
  'penalty_spam',
] as const;

export type XPSourceType = (typeof XP_SOURCE_TYPES)[number];

// ============================================================
// FULL QUICK-REFERENCE TABLE (for documentation/debugging)
// ============================================================
//
//  Action                     | XP          | Type     | Daily Cap | Weekly Cap | Timing
// ----------------------------|-------------|----------|-----------|------------|------------------------
//  Story hits 100 reads       | +50         | Deferred | —         | —          | On read-milestone event
//  Story hits 1,000 reads     | +200        | Deferred | —         | —          | On read-milestone event
//  Story hits 10,000 reads    | +1,000      | Deferred | —         | —          | On read-milestone event
//  Chapter survival bonus     | +3 to +15   | Deferred | —         | +100/week  | 7 days after publish
//  Chapter score ≥ 10         | +20         | Deferred | —         | —          | 24h after score reached
//  Chapter score ≥ 50         | +50         | Deferred | —         | —          | 24h after score reached
//  Chapter upvoted            | +1          | Instant  | +20/day   | +100/week  | Immediate
//  Chapter downvoted          | −1          | Instant  | —         | —          | Immediate (min 0 total)
//  PR approved                | +40         | Instant* | —         | +200/week  | On approval (≥1h open)
//  PR rejected                | −5          | Instant  | —         | —          | Immediate (min 0 total)
//  PR submitted               | +0          | —        | —         | —          | No XP
//  PR review submitted        | +10         | Instant  | +30/day   | +100/week  | Immediate (max 3/day)
//  Comment written (20–99ch)  | +2          | Instant  | +10/day   | +50/week   | Immediate (max 5/day)
//  Comment written (100+ch)   | +5          | Instant  | +10/day   | +50/week   | Immediate (max 5/day)
//  Comment received           | +3          | Instant  | +30/day   | +150/week  | Immediate
//  Follow received            | +5          | Instant  | —         | +50/week   | Immediate
//  Follow someone             | +0          | —        | —         | —          | No XP
//  Valid report confirmed     | +5          | Deferred | —         | —          | On moderator action
//  Story spam confirmed       | −30         | Instant  | —         | —          | On moderator action
//  Chapter spam confirmed     | −20         | Instant  | —         | —          | On moderator action
//  Global daily ceiling       | n/a         | —        | +150/day  | —          | Rolling 24h window
// ============================================================
