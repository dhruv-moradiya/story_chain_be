# 🎮 StoryChain Gamification Architecture

> **Last Updated:** July 2026
> **Scope:** XP System · Level Progression · Badge Awards · Anti-Abuse Design

---

## Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [The Abuse Problem — Why Simple XP Fails](#the-abuse-problem--why-simple-xp-fails)
3. [Core Anti-Abuse Principles](#core-anti-abuse-principles)
4. [XP System — Quality-Gated Design](#xp-system--quality-gated-design)
5. [Level Progression System](#level-progression-system)
6. [Badge System](#badge-system)
7. [Gamification Flow (End-to-End)](#gamification-flow-end-to-end)
8. [Constants & Configuration Reference](#constants--configuration-reference)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview & Philosophy

StoryChain's gamification system rewards **meaningful contribution to the community**, not raw activity volume. The core insight is:

> **XP should be a proof of impact, not a proof of effort.**

A user who creates 1 story that 500 people read should earn far more XP than a user who creates 100 empty/unread stories.

| System     | Purpose                                                  | Stored On       |
| ---------- | -------------------------------------------------------- | --------------- |
| **XP**     | Numeric score earned through community-validated actions | `user.xp`       |
| **Level**  | Derived from XP; represents the user's tier              | `user.level`    |
| **Badges** | One-time awards for hitting verified milestones          | `user.badges[]` |

---

## The Abuse Problem — Why Simple XP Fails

The naïve approach of "action → instant XP" is trivially exploitable:

| Attack Vector         | How it's Abused                     | Naïve XP Lost            |
| --------------------- | ----------------------------------- | ------------------------ |
| Spam story creation   | Create 100 empty stories            | +5,000 XP                |
| Spam chapter creation | Create 100 empty chapters           | +5,000 XP                |
| Alt-account voting    | 5 fake accounts upvote each chapter | Unlimited XP per chapter |
| Comment spam          | Post "nice!" 200 times              | +200 XP                  |
| Follow farming        | 50 bots follow each other           | +250 XP per user         |
| PR spam               | Submit 50 empty/garbage PRs         | +250 XP                  |

**The fix requires multiple defense layers working together — no single solution is enough.**

---

## Core Anti-Abuse Principles

The system is built on **5 pillars**. Every XP rule must satisfy at least one:

### Pillar 1 — 🔒 Quality Gate (Content must prove value before XP is awarded)

XP for creating stories and chapters is **NOT awarded immediately**. It is held in escrow and released only after the content demonstrates real community engagement.

```
Content Created → Escrow Period (48–72h) → Community Validates → XP Released
                                              │ (or deleted/flagged)
                                              ▼ No engagement
                                          XP Never Released
```

### Pillar 2 — 📉 Diminishing Returns (Same action = less XP each time)

The same action earns less XP each time it is repeated within a time window. Spam becomes pointless.

```
Story #1 this week: 50 XP
Story #2 this week: 25 XP
Story #3 this week: 12 XP
Story #4+ this week: 0 XP
```

### Pillar 3 — 🗓️ Daily & Weekly Hard Caps

A user cannot earn more than a fixed amount of XP per day or per week from any single action category, regardless of how many times they perform it.

### Pillar 4 — 🌐 Community Validation (XP sourced from others, not self)

The highest-value XP only flows when real other users take an action. Upvotes, follows, and comments FROM other users are harder to farm at scale.

### Pillar 5 — ⏱️ Cooldowns & Rate Limiting

Hard time limits between the same action type. Cooldowns are enforced at the service layer (not just API rate limiting).

---

## XP System — Quality-Gated Design

### ⚠️ Critical Rule: Two Categories of XP

| Category        | Description                     | When Awarded                   |
| --------------- | ------------------------------- | ------------------------------ |
| **Instant XP**  | Low-value, low-risk actions     | Immediately on action          |
| **Deferred XP** | High-value, abuse-prone actions | After validation window passes |

---

### 📖 Story Actions

| Action                                           | XP         | Type            | Guard / Condition                                      |
| ------------------------------------------------ | ---------- | --------------- | ------------------------------------------------------ |
| Story reaches **100 unique reads** in 30 days    | **+50**    | Deferred        | Minimum 48h old; reads must be from distinct IPs/users |
| Story reaches **1,000 unique reads** in 30 days  | **+200**   | Deferred        | Same as above; awarded once per story                  |
| Story reaches **10,000 unique reads** in 30 days | **+1,000** | Deferred        | Same as above; awarded once per story                  |
| Story is reported + confirmed spam/empty         | **−30**    | Instant penalty | Moderator confirms report                              |

> ❌ **Removed:** `CREATE_STORY: +50` — Creating a story alone earns zero XP. The act of publishing an empty/abandoned story should provide no reward.

> ✅ **Why deferred reads?** A user cannot fake 100 unique reads easily — especially with IP deduplication and the `readingHistory.qualifyingRead` flag you already track.

> 🔑 **Milestones are CUMULATIVE and STACK on the same story.** A single story that grows from 0 → 10,000 reads earns ALL three tiers in sequence: **+50 + +200 + +1,000 = 1,250 XP** from one exceptional piece of content. This directly rewards the writer who has one viral story over a writer who creates dozens of mediocre ones.

---

### 📝 Chapter Actions

Chapter XP is the most abuse-prone area. A user can create dozens of stub chapters. The redesign:

| Action                                                                         | XP      | Type                  | Guard / Condition                               |
| ------------------------------------------------------------------------------ | ------- | --------------------- | ----------------------------------------------- |
| Chapter survives 7 days without deletion/flagging **AND** has ≥ 5 unique reads | **+15** | Deferred (7-day hold) | Applies to all published chapters               |
| Chapter gets **net score ≥ 10** (upvotes − downvotes)                          | **+20** | Deferred              | Awarded once; score must be sustained for 24h   |
| Chapter gets **net score ≥ 50**                                                | **+50** | Deferred              | Awarded once per chapter; stacks with ≥10 bonus |
| Someone upvotes your chapter                                                   | **+1**  | Instant               | Max **+20 XP/day** from this source             |
| Someone downvotes your chapter                                                 | **−1**  | Instant               | Min 0 XP total ever                             |
| Chapter deleted by moderator for spam                                          | **−20** | Instant penalty       | Applied to author                               |

**Weekly chapter XP cap:** Max **+100 XP/week** from the "chapter survives 7 days" bonus.
This means even if you publish 100 chapters, you only earn as if you published ~6–7 meaningful ones.

> ❌ **Removed:** `CREATE_ROOT_CHAPTER: +50` and `CREATE_BRANCH_CHAPTER: +20` as instant XP on publish.

---

### 🔀 Pull Request Actions

PRs already have community validation built in (they must be approved). But PR spam is still possible.

| Action                    | XP      | Type                  | Guard / Condition                                                      |
| ------------------------- | ------- | --------------------- | ---------------------------------------------------------------------- |
| PR gets **approved**      | **+40** | Instant (on approval) | Only awarded if PR was open for ≥ 1 hour (prevents self-approve abuse) |
| PR gets **rejected**      | **−5**  | Instant               | Prevents spam PR submissions                                           |
| Review a PR (as reviewer) | **+10** | Instant               | Max **+30 XP/day** from reviewing (3 reviews/day max contribution)     |
| PR submitted              | **+0**  | —                     | Submission alone earns nothing                                         |

> **Why penalize rejected PRs?** It creates a cost for spamming garbage PRs. A user with a −50 XP balance from rejections has a strong incentive to submit quality work.

**Weekly PR approval cap:** Max **+200 XP/week** from approved PRs (5 approvals × 40 XP).

---

### 💬 Community Actions

| Action                                           | XP     | Type    | Guard / Condition                                        |
| ------------------------------------------------ | ------ | ------- | -------------------------------------------------------- |
| Write a comment (min 20 characters)              | **+2** | Instant | Max **+10 XP/day** from comments (5 comments/day max)    |
| Write a comment (min 100 characters, meaningful) | **+5** | Instant | Included in same daily cap                               |
| Your chapter/story receives a comment            | **+3** | Instant | Max **+30 XP/day** from received comments                |
| Someone follows you                              | **+5** | Instant | Max **+50 XP/week** from follows (10 new followers/week) |
| Follow a user                                    | **+0** | —       | Following earns nothing for the follower                 |

**Comment quality gate:** Comments under 20 characters earn 0 XP. This kills "nice!" spam.

---

### 🛡️ Moderation Actions

| Action                                   | XP      | Type     | Guard / Condition                             |
| ---------------------------------------- | ------- | -------- | --------------------------------------------- |
| Review a PR (collaborator/reviewer role) | **+10** | Instant  | Max 3 reviews/day contributing to XP          |
| Report confirmed as valid by moderator   | **+5**  | Deferred | Reward goes to the reporter when mod confirms |

---

### 📊 XP Daily & Weekly Caps Summary

| Source Category                   | Daily Cap  | Weekly Cap   |
| --------------------------------- | ---------- | ------------ |
| Chapter upvotes received          | +20 XP/day | +100 XP/week |
| Comments written                  | +10 XP/day | +50 XP/week  |
| Comments received on your content | +30 XP/day | +150 XP/week |
| New followers gained              | —          | +50 XP/week  |
| PR reviews done                   | +30 XP/day | +100 XP/week |
| PR approvals received             | —          | +200 XP/week |
| Chapter survival bonus            | —          | +100 XP/week |

**Global daily XP cap:** A user can earn at most **+150 XP in any single day** from all sources combined. This is the ultimate hard ceiling.

---

### 🧮 Diminishing Returns Formula

For story and chapter creation (the primary abuse vector), apply diminishing returns **within a rolling 7-day window**:

```typescript
// Diminishing returns multiplier — applied to chapter survival bonus
function getDiminishingMultiplier(countThisWeek: number): number {
  if (countThisWeek === 0) return 1.0; // 1st chapter: 100% XP (15 XP)
  if (countThisWeek === 1) return 0.7; // 2nd chapter: 70% XP (10 XP)
  if (countThisWeek === 2) return 0.4; // 3rd chapter: 40% XP (6 XP)
  if (countThisWeek === 3) return 0.2; // 4th chapter: 20% XP (3 XP)
  return 0; // 5th+: 0 XP
}
```

This means a spam author creating 20 chapters per week earns the same as creating 4. There is no incentive to go beyond the diminishing threshold.

---

### 📦 New Model Required: `XpTransaction`

To enforce caps, track diminishing returns, and audit XP history, create a new collection:

```typescript
// src/models/xpTransaction.model.ts
const xpTransactionSchema = new Schema(
  {
    userId: { type: String, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // +ve or -ve
    reason: { type: String, required: true }, // XP_REWARDS key
    sourceId: { type: String }, // chapter/story/PR slug
    sourceType: {
      type: String,
      enum: ['story', 'chapter', 'pr', 'comment', 'follow', 'moderation'],
    },
    status: { type: String, enum: ['pending', 'credited', 'rejected'], default: 'credited' },
    creditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

xpTransactionSchema.index({ userId: 1, reason: 1, createdAt: -1 });
xpTransactionSchema.index({ userId: 1, createdAt: -1 }); // for daily/weekly cap checks
```

**Before awarding any XP**, query this collection to check if the daily/weekly cap for that category has been reached.

---

## Level Progression System

### Level Table

| Level | Title                   | Min XP | Max XP | Notes                                    |
| ----- | ----------------------- | ------ | ------ | ---------------------------------------- |
| 1     | 🌱 **Beginner**         | 0      | 99     | Every new user starts here               |
| 2     | ✏️ **Writer**           | 100    | 299    | First story with real readers            |
| 3     | 📖 **Author**           | 300    | 599    | Consistent quality contributor           |
| 4     | 🗺️ **Storyteller**      | 600    | 999    | Community is engaging with content       |
| 5     | 🏅 **Master**           | 1,000  | 1,999  | Proven track record                      |
| 6     | 🔨 **Wordsmith**        | 2,000  | 3,499  | High-quality, well-read work             |
| 7     | 🌟 **Legendary Author** | 3,500  | 5,499  | Beloved by the community                 |
| 8     | 🎙️ **Epic Narrator**    | 5,500  | 8,499  | Platform pillar                          |
| 9     | 🕸️ **Mythweaver**       | 8,500  | 12,499 | Elite creator                            |
| 10    | 👑 **Grandmaster**      | 12,500 | ∞      | Unreachable without sustained excellence |

### Why the Thresholds Work

With the anti-abuse system, **reaching Level 5 (1,000 XP) requires genuine platform participation.** Three realistic paths are compared below:

---

#### 🌟 Path A — The Single Viral Story Writer

> One story, 10,000 readers. Quality over quantity.

| Source                                                 | Calculation   | XP                          |
| ------------------------------------------------------ | ------------- | --------------------------- |
| Story hits 100 unique reads (Milestone 1)              | +50           | **50 XP**                   |
| Same story hits 1,000 unique reads (Milestone 2)       | +200          | **200 XP**                  |
| Same story hits 10,000 unique reads (Milestone 3)      | +1,000        | **1,000 XP**                |
| 5 chapters for that story, each survives 7d with reads | 5 × 15 XP     | **75 XP**                   |
| 200 chapter upvotes (weekly capped)                    | ~100 XP total | **100 XP**                  |
| **Total**                                              |               | **~1,425 XP → Level 5+** ✅ |

> 💡 **One exceptional story alone can carry a user to Level 5.** The milestone stacking (50 + 200 + 1,000) is the reward for sustained, growing quality.

---

#### 📚 Path B — The Consistent Multi-Story Writer

> 10 solid stories, each finding a real audience.

| Source                                                                     | Calculation    | XP                         |
| -------------------------------------------------------------------------- | -------------- | -------------------------- |
| 5 stories hit 100 reads (Milestone 1 each)                                 | 5 × 50         | **250 XP**                 |
| 2 of those stories hit 1,000 reads (Milestone 2)                           | 2 × 200        | **400 XP**                 |
| 15 chapters, each with ≥5 reads, survive 7 days (with diminishing returns) | ~100 XP capped | **100 XP**                 |
| 5 PRs approved on collaborations                                           | 5 × 40         | **200 XP**                 |
| Comments received (weekly capped)                                          | ~100 XP        | **100 XP**                 |
| **Total**                                                                  |                | **~1,050 XP → Level 5** ✅ |

> 💡 Both paths reach Level 5, but the viral single-story writer gets there **faster** because the 1,000 XP milestone rewards them disproportionately.

---

#### 🚫 Path C — The Spammer (Fully Blocked)

| Source                               | Why it fails                        | XP                          |
| ------------------------------------ | ----------------------------------- | --------------------------- |
| Creates 100 empty stories            | No readers → no milestone triggered | **0 XP**                    |
| Creates 100 stub chapters (no reads) | Fails the ≥5 unique reads gate      | **0 XP**                    |
| 50 garbage PRs submitted             | Rejected → −5 XP each → net loss    | **−250 XP**                 |
| **Total**                            |                                     | **0 XP → Still Level 1** ✅ |

### Level-Up Event Pipeline

```
XP Transaction Credited
        │
        ▼
calculateLevel(user.xp)
        │
        ├── Same level? → Done
        │
        └── Level increased?
                │
                ▼
        Update user.level in DB
        Send push notification: "You reached Level 4 — Storyteller! 🗺️"
        Create Notification record
        Dispatch BullMQ job: check badge eligibility
```

---

## Badge System

### Badge Philosophy

Badges should be **hard to fake**. Every badge requirement must be community-validated or time-gated:

- ✅ **Good requirement:** "500 unique readers across all your stories" — requires real people reading
- ❌ **Bad requirement:** "Created 50 chapters" — easily spammed

### Badge Definitions

#### 🏗️ Story Badges (Community-Validated)

| Badge ID           | Name             | Icon | Requirement                               | What Makes it Hard to Fake            |
| ------------------ | ---------------- | ---- | ----------------------------------------- | ------------------------------------- |
| `STORY_STARTER`    | Story Starter    | 📖   | 1st story hits **50 unique reads**        | Needs real readers, not just creation |
| `PROLIFIC_CREATOR` | Prolific Creator | 📚   | 5 different stories each with ≥ 100 reads | Volume + quality; can't spam          |
| `STORY_MASTER`     | Story Master     | 🏆   | 1 story hits 10,000 reads                 | Viral/beloved content only            |

#### ✍️ Chapter Badges (Score-Validated)

| Badge ID          | Name            | Icon | Requirement                                   | What Makes it Hard to Fake      |
| ----------------- | --------------- | ---- | --------------------------------------------- | ------------------------------- |
| `BRANCH_CREATOR`  | Branch Creator  | 🌿   | 10 branch chapters each with net score ≥ 5    | Quality branching, not quantity |
| `TOP_CONTRIBUTOR` | Top Contributor | ✍️   | 25 chapters total, each with ≥ 5 unique reads | Sustained quality, not spam     |

#### ⭐ Quality Badges (Hardest to Fake)

| Badge ID             | Name               | Icon | Requirement                                                  | What Makes it Hard to Fake                    |
| -------------------- | ------------------ | ---- | ------------------------------------------------------------ | --------------------------------------------- |
| `MOST_UPVOTED`       | Most Upvoted       | 👍   | Single chapter reaches **100 upvotes** with net score ≥ 80   | Requires mass genuine community approval      |
| `TRENDING_AUTHOR`    | Trending Author    | 🔥   | Story appears in platform top 10 trending (algorithm-driven) | Cannot be manually triggered                  |
| `COMMUNITY_FAVORITE` | Community Favorite | ⭐   | 1,000+ total upvotes across all chapters, net positive       | Requires sustained quality across many pieces |

#### 🤝 Collaboration Badges (PR-Gated)

| Badge ID          | Name            | Icon | Requirement                                             | What Makes it Hard to Fake                |
| ----------------- | --------------- | ---- | ------------------------------------------------------- | ----------------------------------------- |
| `COLLABORATIVE`   | Collaborative   | 🤝   | 10 **approved** PRs on **at least 5 different** stories | Requires separate story owners to approve |
| `QUALITY_CURATOR` | Quality Curator | ✅   | 10 approved PRs with approval rate ≥ 70%                | High rejection rate blocks this badge     |

#### 🗓️ Longevity Badges (Time-Gated)

| Badge ID         | Name           | Icon | Requirement                                                   | What Makes it Hard to Fake         |
| ---------------- | -------------- | ---- | ------------------------------------------------------------- | ---------------------------------- |
| `VETERAN_WRITER` | Veteran Writer | 🗓️   | Account ≥ 365 days old **AND** ≥ 50 XP earned in last 30 days | Must stay active — no idle farming |

### When to Check Badge Eligibility

| Badge                | Check After This Event     | Verified Stat                                      |
| -------------------- | -------------------------- | -------------------------------------------------- |
| `STORY_STARTER`      | Story read count update    | `distinctReaders >= 50` on any story               |
| `PROLIFIC_CREATOR`   | Story read count update    | Count of stories with `distinctReaders >= 100`     |
| `STORY_MASTER`       | Story read count update    | Any story `distinctReaders >= 10,000`              |
| `BRANCH_CREATOR`     | Chapter vote update        | Count branches with `net_score >= 5`               |
| `TOP_CONTRIBUTOR`    | Chapter read update        | Count chapters with `reads >= 5 AND author = user` |
| `MOST_UPVOTED`       | Chapter vote update        | Any chapter `upvotes >= 100 AND net_score >= 80`   |
| `TRENDING_AUTHOR`    | Trending recalculation job | Story in top 10                                    |
| `COMMUNITY_FAVORITE` | Any chapter upvoted        | `user.stats.totalUpvotes >= 1000` AND net positive |
| `COLLABORATIVE`      | PR approved                | Approved PRs on distinct stories count             |
| `QUALITY_CURATOR`    | PR approved                | Approved PR count + approval rate                  |
| `VETERAN_WRITER`     | Daily cron                 | `accountAge >= 365d AND recentXP >= 50`            |

### Badge Award Logic

```typescript
async function checkAndAwardBadge(
  userId: string,
  badgeId: BadgeId,
  verifiedValue: number // already fetched from DB — no self-reporting
): Promise<boolean> {
  const user = await User.findById(userId).select('badges');
  if (!user) return false;

  // Skip if already awarded — $addToSet handles this but check early for efficiency
  if (user.badges.includes(badgeId)) return false;

  // Check threshold against VERIFIED community data
  if (!checkBadgeEligibility(badgeId, verifiedValue)) return false;

  // Award badge atomically
  await User.findByIdAndUpdate(userId, { $addToSet: { badges: badgeId } });

  // Fire notification
  await NotificationService.send({
    userId,
    type: 'BADGE_EARNED',
    title: `🏅 New Badge: ${BADGES[badgeId].name}`,
    message: BADGES[badgeId].description,
  });

  return true;
}
```

---

## Gamification Flow (End-to-End)

### Story Creation Flow (No Instant XP)

```
POST /api/stories
       │
       ▼
StoryService.create()
  → story saved to DB
  → user.stats.storiesCreated++
  → XP: ZERO (nothing awarded on creation)
  → BullMQ: schedule "story-xp-eligibility-check" job after 48h
  → badge check: STORY_STARTER only triggered when reads reach 50 (not now)
```

### Story Read Milestone Flow (Deferred XP)

```
[BullMQ Worker: reading-history-update]
  → story.stats.reads++ (qualifying reads only)
  → story.stats.uniqueReaders++ (deduplicated by userId/IP)
  →
  → if uniqueReaders crosses 50 (first time):
      → Check: story.milestonesAwarded.reads50 === false?
      → Award XP to author: +50 (STORY_MILESTONE_50_READS)
      → Set story.milestonesAwarded.reads50 = true
      → Check STORY_STARTER badge
  →
  → if uniqueReaders crosses 1000 (first time):
      → Award XP to author: +200
      → Check PROLIFIC_CREATOR, STORY_MASTER badges
```

### Chapter Publish Flow (7-Day Deferred XP)

```
POST /api/chapters
       │
       ▼
ChapterService.create()
  → chapter saved to DB
  → user.stats.chaptersWritten++
  → XP: ZERO immediately
  → BullMQ: schedule "chapter-xp-eligibility-check" job after 7 days
             (job checks: not deleted, not flagged, uniqueReads >= 5)
```

```
[BullMQ Worker: chapter-xp-eligibility-check] (runs 7 days after chapter created)
  → Chapter still exists? Not deleted? Not flagged?
  → chapter.stats.uniqueReaders >= 5?
  → Check weekly cap: user already earned < 100 XP from chapter survival this week?
  → Apply diminishing returns multiplier based on chaptersThisWeek count
  → Award XP: 15 XP × multiplier
  → Check TOP_CONTRIBUTOR badge
```

### PR Lifecycle Flow

```
PR Submitted  →  XP: +0  (no reward for submitting)
                 Validates: content meets min length, isn't duplicate

PR Approved   →  Check: PR was open for >= 1 hour (not self-reviewed loop)
                 Check: weekly PR approval cap (max +200 XP/week)
                 XP to AUTHOR: +40 (PR_APPROVED)
                 user.stats.approvedPRs++
                 Badge checks: QUALITY_CURATOR, COLLABORATIVE

PR Rejected   →  XP to AUTHOR: −5 (PR_REJECTED penalty)
                 This discourages spam PR submissions
                 user.stats.rejectedPRs++
```

### Chapter Vote Flow (Capped)

```
POST /api/votes  (upvote on a chapter)
       │
       ▼
VoteService.create()
  → vote saved (unique constraint: one vote per user per chapter)
  → chapter.votes.upvotes++
  → Check: author's daily upvote-XP cap reached? (max +20 XP/day)
  → If under cap: XP to CHAPTER AUTHOR: +1
  → user.stats.totalUpvotes++
  → Badge checks: MOST_UPVOTED (chapter upvotes >= 100 AND net >= 80)
                  COMMUNITY_FAVORITE (total upvotes >= 1000)
```

### Comment Flow (Character-Gated)

```
POST /api/comments
       │
       ▼
CommentService.create()
  → Validate: content.trim().length >= 20  ← blocks "nice!" spam
  → comment saved
  → Check author's daily comment XP cap (max +10 XP/day from writing)
  → If under cap:
      → len >= 100 chars: XP to commenter: +5
      → len >= 20 chars:  XP to commenter: +2
  → Check content owner's daily received-comment cap (max +30/day)
  → If under cap: XP to content owner: +3
```

### Follow Flow (Weekly-Capped)

```
POST /api/follow
       │
       ▼
FollowService.follow()
  → follow document saved
  → Check: followed user's weekly follow XP cap (max +50 XP/week from follows)
  → If under cap: XP to FOLLOWED USER: +5
  → XP to FOLLOWER: +0 (always zero)
  → Badge check: POPULAR (followerCount >= 100)
```

---

## Constants & Configuration Reference

All constants live in [`src/constants/index.ts`](file:///Users/mac/Desktop/dhruv/story_chain_be/src/constants/index.ts).

### Updated `XP_REWARDS`

```typescript
export const XP_REWARDS = {
  // Story milestones (deferred — requires real unique readers)
  STORY_MILESTONE_50_READS: 50,
  STORY_MILESTONE_1000_READS: 200,
  STORY_MILESTONE_10000_READS: 1000,

  // Chapter (deferred 7-day survival bonus — before diminishing returns)
  CHAPTER_SURVIVAL_BASE: 15,
  CHAPTER_SCORE_10: 20, // chapter reaches net score >= 10
  CHAPTER_SCORE_50: 50, // chapter reaches net score >= 50

  // Voting (instant — capped)
  CHAPTER_UPVOTED: 1,
  CHAPTER_DOWNVOTED: -1,

  // PR actions (instant on approval)
  PR_APPROVED: 40,
  PR_REJECTED: -5,
  PR_SUBMITTED: 0,

  // Community (instant — capped)
  COMMENT_SHORT: 2, // 20–99 chars
  COMMENT_LONG: 5, // 100+ chars
  RECEIVE_COMMENT: 3,
  FOLLOW_USER: 0,
  GET_FOLLOWED: 5,

  // Moderation (instant)
  REVIEW_PR: 10,
  VALID_REPORT: 5, // reporter rewarded when report is confirmed
} as const;
```

### New: `XP_CAPS` — Hard Limits

```typescript
export const XP_CAPS = {
  // Daily caps per source category
  DAILY: {
    GLOBAL: 150, // Max XP from ALL sources in one day
    FROM_CHAPTER_UPVOTES: 20, // Upvotes received on your chapters
    FROM_COMMENTS_WRITTEN: 10, // XP from comments you write
    FROM_COMMENTS_RECEIVED: 30, // XP from comments others leave on your content
    FROM_PR_REVIEWS: 30, // XP from reviewing PRs
  },
  // Weekly caps per source category
  WEEKLY: {
    FROM_CHAPTER_SURVIVAL: 100, // 7-day survival bonus for chapters
    FROM_PR_APPROVALS: 200, // 5 PR approvals × 40 XP
    FROM_FOLLOWS: 50, // 10 new followers × 5 XP
    FROM_CHAPTER_UPVOTES: 100,
    FROM_COMMENTS_WRITTEN: 50,
    FROM_COMMENTS_RECEIVED: 150,
    FROM_PR_REVIEWS: 100,
  },
  MIN_XP: 0, // XP can never go negative
} as const;
```

### New: `XP_QUALITY_GATES` — Validation Thresholds

```typescript
export const XP_QUALITY_GATES = {
  STORY: {
    MIN_UNIQUE_READS_FOR_MILESTONE: 50, // First milestone threshold
    ESCROW_WINDOW_HOURS: 48, // Story must exist for 48h before any milestone counts
  },
  CHAPTER: {
    MIN_UNIQUE_READS_FOR_SURVIVAL_XP: 5, // Chapter needs ≥5 reads to earn survival XP
    SURVIVAL_WINDOW_DAYS: 7, // Chapter must survive 7 days unflagged
    MIN_SCORE_FOR_SCORE_BONUS: 10, // Net score needed for score bonus
  },
  COMMENT: {
    MIN_LENGTH_FOR_XP: 20, // Minimum comment length to earn XP
    LONG_COMMENT_LENGTH: 100, // Length threshold for long-comment bonus
  },
  PR: {
    MIN_OPEN_HOURS_BEFORE_APPROVAL: 1, // PR must be open ≥1h before approval XP counts
  },
} as const;
```

### New: `DIMINISHING_RETURNS` — Weekly Multipliers

```typescript
export const DIMINISHING_RETURNS = {
  CHAPTER_SURVIVAL: [
    { countThisWeek: 0, multiplier: 1.0 }, // 1st chapter: 100% = 15 XP
    { countThisWeek: 1, multiplier: 0.7 }, // 2nd chapter:  70% = 10 XP
    { countThisWeek: 2, multiplier: 0.4 }, // 3rd chapter:  40% =  6 XP
    { countThisWeek: 3, multiplier: 0.2 }, // 4th chapter:  20% =  3 XP
    { countThisWeek: 4, multiplier: 0.0 }, // 5th+:          0% =  0 XP
  ],
} as const;
```

### New: `GAMIFICATION_EVENTS` — BullMQ Job Names

```typescript
export const GAMIFICATION_EVENTS = {
  CHAPTER_XP_CHECK: 'gamification.chapter-xp-check', // Fires 7d after chapter publish
  STORY_MILESTONE_CHECK: 'gamification.story-milestone', // Fires when story reads update
  VETERAN_BADGE_CHECK: 'gamification.veteran-check', // Daily cron
  XP_AWARDED: 'gamification.xp-awarded',
  LEVEL_UP: 'gamification.level-up',
  BADGE_EARNED: 'gamification.badge-earned',
} as const;
```

### New: `BADGE_CATEGORY` — UI Grouping

```typescript
export const BADGE_CATEGORY = {
  STORY: ['STORY_STARTER', 'PROLIFIC_CREATOR', 'STORY_MASTER'],
  CHAPTER: ['BRANCH_CREATOR', 'TOP_CONTRIBUTOR'],
  QUALITY: ['MOST_UPVOTED', 'TRENDING_AUTHOR', 'COMMUNITY_FAVORITE'],
  COLLABORATION: ['COLLABORATIVE', 'QUALITY_CURATOR'],
  COMMUNITY: ['VETERAN_WRITER'],
} as const;
```

### New Model: `milestonesAwarded` on Story

```typescript
// In story.model.ts — add this field
milestonesAwarded: {
  reads50:    { type: Boolean, default: false },
  reads1000:  { type: Boolean, default: false },
  reads10000: { type: Boolean, default: false },
},
```

---

## Implementation Checklist

### Phase 1 — Core Infrastructure

- [ ] Create `src/models/xpTransaction.model.ts` (audit log + cap enforcement)
- [ ] Create `GamificationService` at `src/features/user/services/gamification.service.ts` with:
  - [ ] `awardXP(userId, amount, reason, sourceId?, sourceType?)` — checks caps, inserts transaction, updates user.xp
  - [ ] `checkDailyCap(userId, reason): Promise<boolean>` — queries xpTransaction for today
  - [ ] `checkWeeklyCap(userId, reason): Promise<boolean>` — queries xpTransaction for this week
  - [ ] `getDiminishingMultiplier(userId, type): Promise<number>` — counts actions this week
  - [ ] `recalculateLevel(userId)` — called after every XP change
  - [ ] `checkAndAwardBadge(userId, badgeId, verifiedValue)` — idempotent badge award

### Phase 2 — XP Hook Points

- [ ] **Story:** Remove instant XP on story create. Hook story read-update to trigger milestone check.
- [ ] **Chapter:** Remove instant XP on chapter publish. Schedule `CHAPTER_XP_CHECK` BullMQ job.
- [ ] **Vote:** `VoteService.create()` → `±1 XP` to chapter author (check daily cap first)
- [ ] **PR:** `PullRequestService.approve()` → `+40 XP` (check 1h open gate + weekly cap)
- [ ] **PR:** `PullRequestService.reject()` → `−5 XP` to author (guard: min 0 total)
- [ ] **Comment:** `CommentService.create()` → `+2/+5 XP` to commenter, `+3 XP` to content owner (check caps + min length)
- [ ] **Follow:** `FollowService.follow()` → `+5 XP` to followed user (check weekly cap)
- [ ] **PR Review:** `PrReviewService.create()` → `+10 XP` (check daily 3-review cap)

### Phase 3 — BullMQ Jobs

- [ ] `chapter-xp-eligibility-check` job (delayed 7 days):
  - [ ] Verify chapter not deleted/flagged
  - [ ] Verify `uniqueReaders >= 5`
  - [ ] Apply diminishing returns
  - [ ] Check weekly chapter survival cap
  - [ ] Award XP if passes
- [ ] `story-milestone-check` job (triggered on read count update):
  - [ ] Deduplicate by `readingHistory.qualifyingRead`
  - [ ] Check `story.milestonesAwarded.*`
  - [ ] Award milestone XP once per tier
- [ ] `veteran-badge-check` daily cron:
  - [ ] Find users without `VETERAN_WRITER`
  - [ ] Check account age + recent XP activity
  - [ ] Award badge

### Phase 4 — Badge System

- [ ] Wire badge checks into all trigger points (see badge table)
- [ ] Add `BADGE_CATEGORY` constant
- [ ] Update `user.badges` enum in model to include all future badges

### Phase 5 — Leaderboard & API

- [ ] `GET /api/users/leaderboard` — sorted by `xp` desc (index exists)
- [ ] `GET /api/users/:id/gamification` → `{ xp, level, levelTitle, xpToNextLevel, badges, recentTransactions }`
- [ ] `GET /api/gamification/badges` → all badge definitions with earned status

---

## Design Principles

1. **Quality over quantity** — Never reward the act of creating; only reward the impact of what was created.
2. **Community validation is king** — The highest XP flows from other users' genuine actions (reading, upvoting, approving PRs).
3. **Caps prevent ceiling breaking** — A daily global cap of 150 XP means no single exploit can explode a user's score.
4. **Diminishing returns kill spam** — Volume tactics hit a wall of zero returns; there's no point spamming.
5. **Audit everything** — `xpTransaction` gives you visibility into every XP event, making it easy to detect and reverse abuse.
6. **Idempotency for badges** — Always `$addToSet`, never `$push`.
7. **Async for heavy jobs** — All deferred XP goes through BullMQ; never block the HTTP response for gamification.
8. **Penalize confirmed bad behavior** — Rejected PRs (−5 XP) and moderator-confirmed spam (−30 XP for story, −20 XP for chapter) create real cost for abuse.
