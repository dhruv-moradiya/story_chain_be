# Storychain — Pull Request System

A pull request on Storychain is a **community proposal to add or edit a chapter in a story**. It is not a git-style code diff. Think of it as: *"I wrote a chapter — please read it, vote on it, and let the community decide whether it becomes part of the story."*

---

## Table of Contents

1. [Models Overview](#1-models-overview)
2. [PullRequest](#2-pullrequest)
3. [PRReview](#3-prreview)
4. [PRComment](#4-prcomment)
5. [PRVote](#5-prvote)
6. [PRTimeline](#6-prtimeline)
7. [Enums Reference](#7-enums-reference)
8. [Role × Permission Matrix](#8-role--permission-matrix)
9. [Scenario Flows](#9-scenario-flows)
10. [Service Layer Rules](#10-service-layer-rules)
11. [Key Design Decisions](#11-key-design-decisions)

---

## 1. Models Overview

| Model | Collection | Purpose | One per |
|---|---|---|---|
| `PullRequest` | `pullrequests` | The proposal itself — state, content, votes aggregate | PR |
| `PRReview` | `prreviews` | Formal verdict from a reviewer | Reviewer per PR |
| `PRComment` | `prcomments` | Freeform discussion threads | Unlimited per PR |
| `PRVote` | `prvotes` | Community upvote / downvote | User per PR |
| `PRTimeline` | `prtimelines` | Immutable event log | One event per action |

### How they relate

```
PullRequest (1)
  ├── PRReview     (many — one per reviewer, unique index)
  ├── PRComment    (many — threaded discussion)
  ├── PRVote       (many — one per user, unique index)
  └── PRTimeline   (many — append-only event log)
```

The `PullRequest` document holds **current state only**. History lives in `PRTimeline`. Vote counts are aggregated onto `PullRequest.votes` for fast reads — the source of truth records are in `PRVote`.

---

## 2. PullRequest

**File:** `src/models/pullRequest.model.ts`

The central document. Owns lifecycle state, content, approval tracking, and vote aggregates.

### Key fields

```typescript
// Identity
title: string                    // "The betrayal at Keth's gate — alternate ending"
description: string              // Author's note explaining creative intent
storySlug: string                // Which story
chapterSlug: string              // The chapter being proposed or edited
parentChapterSlug: string        // Which published chapter this branches from
authorId: string                 // clerkId of the submitting writer

// Type (immutable after creation)
prType: 'new_branch' | 'continuation' | 'edit'

// Content
content.proposed: string         // Full chapter text (max 100KB)
content.wordCount: number
content.readingMinutes: number

// Status (lifecycle)
status: 'open' | 'approved' | 'closed' | 'merged'

// Labels (applied by moderator+)
labels: PRLabel[]

// Community votes (aggregate — source of truth is PRVote)
votes.upvotes: number
votes.downvotes: number
votes.score: number              // upvotes - downvotes

// Auto-approval config (set at creation from story settings)
autoApprove.enabled: boolean
autoApprove.threshold: number    // minimum net score to trigger
autoApprove.timeWindow: number   // days within which votes must accumulate
autoApprove.qualifiedAt: Date    // when score first passed threshold
autoApprove.autoApprovedAt: Date // when auto-approval actually fired

// Approvals tracking
approvalsStatus.required: number         // min approvals before canMerge
approvalsStatus.received: number         // count of approve decisions
approvalsStatus.pending: number          // required - received
approvalsStatus.approvers: string[]      // clerkIds who approved
approvalsStatus.blockers: string[]       // clerkIds with changes_requested
approvalsStatus.canMerge: boolean        // received >= required && blockers = []

// Draft
isDraft: boolean                 // true = hidden from queue, auto-approve suspended
draftReason: string
draftedAt: Date

// Merge / close info
mergedAt: Date
mergedBy: string
closedAt: Date
closedBy: string
closeReason: string

// Stats
commentCount: number
stats.views: number
stats.discussions: number        // thread count (not total comments)
stats.reviewsReceived: number
```

### PR types explained

| Type | When to use | parentChapterSlug |
|---|---|---|
| `new_branch` | Author proposes a new diverging path from an existing chapter | The chapter being branched from |
| `continuation` | Author proposes the next chapter in the current main thread | The current last chapter |
| `edit` | Author proposes a fix to an already-published chapter | Same as `chapterSlug` |

### Status flow

```
open ──────────────────────────────► merged   (approved then merged by moderator+)
open ──► approved ──► merged                  (standard happy path)
open ──────────────────────────────► closed   (author withdrew or creator closed)
open ◄── reopened ◄────────────────  closed   (can be reopened)
```

`merged` and `approved` are terminal — cannot be undone.
`closed` can be reopened.

### Indexes

```typescript
{ storySlug: 1, status: 1, createdAt: -1 }       // primary review queue
{ storySlug: 1, prType: 1, status: 1 }            // filter by type
{ authorId: 1, status: 1 }                         // user's own PR history
{ parentChapterSlug: 1, status: 1 }               // branch tree view
{ 'votes.score': -1 }                              // sort by community preference
{ storySlug: 1, labels: 1, status: 1 }            // label-filtered queue
```

---

## 3. PRReview

**File:** `src/models/prReview.model.ts`

A formal verdict submitted by a reviewer. One document per reviewer per PR — enforced by unique index. Reviewers can update their decision (e.g. `changes_requested` → `approve` after author revises).

### Key fields

```typescript
pullRequestId: ObjectId          // which PR
storySlug: string                // denormalized for activity queries
reviewerId: string               // clerkId of reviewer

// The verdict
decision: 'approve' | 'changes_requested' | 'feedback_only'

// Written feedback
summary: string                  // overall note to author (max 3000 chars)
overallRating: number            // 1–5 stars (optional)

// Revision tracking
isUpdated: boolean               // has reviewer changed their decision?
previousDecision: string         // what it was before the update
updatedAt_review: Date           // separate from Mongoose updatedAt
```

### Decision values and their effects

| Decision | Who can submit | Effect on `approvalsStatus` |
|---|---|---|
| `approve` | moderator, co_author, owner | `received++`, push to `approvers[]`, re-evaluate `canMerge` |
| `changes_requested` | moderator, co_author, owner | push to `blockers[]`, `canMerge = false` |
| `feedback_only` | reviewer, moderator, co_author, owner | **no effect** — structured feedback only |

> `reject` was removed. Closing the PR with a `closeReason` handles rejection — it is more explicit, creates a proper timeline event, and is more informative to the author.

### One review per reviewer — unique index

```typescript
{ pullRequestId: 1, reviewerId: 1 }   // unique — cannot have two
```

When a reviewer updates their decision:
- `decision` is overwritten with new value
- `previousDecision` stores what it was
- `isUpdated` becomes `true`
- `updatedAt_review` is set to now
- Service re-calculates `approvalsStatus` on the PR

### Self-review rule

| Role | Can review own PR? |
|---|---|
| contributor | n/a (cannot review at all) |
| reviewer | n/a (feedback_only only, no effect on approval) |
| moderator | No — service must block |
| co_author | No — service must block |
| owner | **Yes** — owner has editorial authority over their story |

### Indexes

```typescript
{ pullRequestId: 1, reviewerId: 1 }   // unique constraint
{ pullRequestId: 1, createdAt: -1 }   // all reviews for a PR
{ reviewerId: 1, createdAt: -1 }      // reviewer's history
{ pullRequestId: 1, decision: 1 }     // filter by decision type
```

---

## 4. PRComment

**File:** `src/models/prComment.model.ts`

Freeform discussion on a PR. No effect on `approvalsStatus` — purely conversational. Supports one level of threading (top-level comments and replies; replies cannot be replied to).

### Key fields

```typescript
pullRequestId: ObjectId          // which PR
storySlug: string                // denormalized
userId: string                   // clerkId of commenter
parentCommentId: ObjectId        // null = top-level, set = reply

content: string                  // 1–2000 chars

commentType: 'general' | 'suggestion' | 'question' | 'request_changes'

// For suggestion type only
suggestion.originalPassage: string   // exact text being flagged
suggestion.suggestedPassage: string  // proposed replacement
suggestion.context: string           // surrounding text to disambiguate

// Edit tracking
isEdited: boolean
editedAt: Date

// Resolution
isResolved: boolean
resolvedBy: string
resolvedAt: Date
```

### Comment types explained

| Type | Use case | Who uses it |
|---|---|---|
| `general` | Discussion, opinions, praise | reviewer+ |
| `suggestion` | Proposes a specific text rewrite | reviewer+ |
| `question` | Asks author to clarify intent | reviewer+ |
| `request_changes` | Flags a problem that needs fixing | reviewer+ |

> `approval` type was removed. Formal approval belongs in `PRReview.decision`, not in a comment. Mixing the two created ambiguous PR state.

### Who can post comments

| Role | Can post PRComments? | Can resolve others' comments? |
|---|---|---|
| contributor | Only on their own PR (replies only) | Only on their own PR |
| reviewer | Any PR | Their own comments only |
| moderator | Any PR | Any comment on any PR |
| co_author | Any PR | Any comment on any PR |
| owner | Any PR | Any comment on any PR |

### Indexes

```typescript
{ pullRequestId: 1, createdAt: 1 }    // paginate comments chronologically
{ parentCommentId: 1, createdAt: 1 }  // fetch replies to a thread
{ pullRequestId: 1, isResolved: 1 }   // unresolved comments in review queue
{ userId: 1, createdAt: -1 }          // user's comment history
```

---

## 5. PRVote

**File:** `src/models/prVote.model.ts`

A community member's upvote or downvote on a PR. One document per user per PR — unique index. Votes can be flipped (upvote → downvote) by updating the existing document.

### Key fields

```typescript
pullRequestId: ObjectId          // which PR
storySlug: string                // denormalized
userId: string                   // clerkId

vote: 1 | -1                     // 1 = upvote, -1 = downvote

previousVote: 1 | -1 | null      // null = never changed, set = was flipped
changedAt: Date                  // when vote was last flipped (null if never)
```

### Vote flip delta — critical

When a user flips their vote, the score delta is **−2 or +2**, not −1 or +1:

```
upvote (1) → downvote (-1)  = score delta: -2
  (remove upvote: -1) + (add downvote: -1) = -2

downvote (-1) → upvote (1)  = score delta: +2
  (remove downvote: +1) + (add upvote: +1) = +2
```

The `previousVote` field tells your service which direction the flip went, so you compute the correct delta.

```typescript
// In PRVoteService
function calculateDelta(oldVote: number | null, newVote: number): number {
  if (oldVote === null) return newVote;        // first vote: +1 or -1
  return newVote - oldVote;                    // flip: +2 or -2
}
```

### Indexes

```typescript
{ pullRequestId: 1, userId: 1 }   // unique — one vote per user per PR
{ storySlug: 1, createdAt: -1 }   // story-level vote analytics
{ userId: 1, createdAt: -1 }      // user's voting history
```

---

## 6. PRTimeline

**File:** `src/models/prTimeline.model.ts`

An **immutable, append-only event log** for a PR's lifecycle. One document per event. Events are never updated — if an action is undone (e.g. label removed), a new `label_removed` event is written alongside the original `label_added`.

Previously the timeline was an embedded array on `PullRequest`. It was extracted because:
- The PR document grew unboundedly with every action
- The embedded array could not be paginated or queried independently
- Story-level activity feeds required joining through PullRequest

### Key fields

```typescript
pullRequestId: ObjectId          // which PR
storySlug: string                // denormalized for story-level feeds
action: PRTimelineAction         // what happened (see enum below)
performedBy: string | null       // clerkId — null for system events
performedAt: Date                // authoritative event time
metadata: object                 // action-specific context (see below)
```

### Metadata shapes by action

| Action | Metadata |
|---|---|
| `submitted` | `{}` |
| `review_submitted` | `{ decision: string, summary?: string }` |
| `voted` | `{ vote: 1 \| -1, newScore: number }` |
| `auto_approved` | `{ votesReached: number, threshold: number }` |
| `merged` | `{ mergedBy: string, chapterSlug: string }` |
| `closed` | `{ reason?: string }` |
| `reopened` | `{}` |
| `marked_draft` | `{ reason?: string }` |
| `ready_for_review` | `{}` |
| `label_added` | `{ label: string }` |
| `label_removed` | `{ label: string }` |
| `changes_requested` | `{ blockerId: string, summary?: string }` |

### Indexes

```typescript
{ pullRequestId: 1, performedAt: 1 }          // full PR event log, chronological
{ storySlug: 1, performedAt: -1 }             // story-level activity feed
{ pullRequestId: 1, action: 1, performedAt: -1 } // filter by action type
{ performedBy: 1, performedAt: -1 }           // user activity feed
```

---

## 7. Enums Reference

### PRStatus

| Value | Meaning | Terminal? |
|---|---|---|
| `open` | Active — under review or waiting for votes | No |
| `approved` | Required approvals met — ready to merge | No (merges next) |
| `closed` | Closed without merging — can be reopened | No |
| `merged` | Accepted into story | **Yes** |

> `rejected` was removed. Closing the PR with `closeReason` handles rejection — it produces a richer event in PRTimeline and is more informative to the author than a status enum value.

### PRType

| Value | Meaning |
|---|---|
| `new_branch` | New diverging story path from a parent chapter |
| `continuation` | Next chapter in the current main thread |
| `edit` | Fix or improvement to an already-published chapter |

### PRLabel

| Value | Applied by | Meaning |
|---|---|---|
| `needs_review` | moderator+ | Still needs reviewer attention |
| `quality_issue` | moderator+ | Content quality concerns |
| `grammar` | moderator+ | Grammar/spelling issues |
| `plot_hole` | moderator+ | Story inconsistency within chapter |
| `lore_inconsistency` | moderator+ | Breaks established story canon |
| `conflict` | moderator+ | Contradicts a sibling branch |
| `duplicate` | moderator+ | Similar branch already exists |
| `changes_requested` | moderator+ | Author must revise |
| `approved` | moderator+ | Formally approved |
| `good_first_pr` | moderator+ | Good for new reviewers to start with |

### PRReviewDecision

| Value | Who can submit | Effect |
|---|---|---|
| `approve` | moderator, co_author, owner | `approvalsStatus.received++`, push to `approvers[]` |
| `changes_requested` | moderator, co_author, owner | Push to `blockers[]`, `canMerge = false` |
| `feedback_only` | reviewer, moderator, co_author, owner | No effect on `approvalsStatus` |

### PRCommentType

| Value | Use |
|---|---|
| `general` | Discussion, opinions |
| `suggestion` | Proposes specific text rewrite (uses `suggestion` subfield) |
| `question` | Asks author for clarification |
| `request_changes` | Flags a problem informally (no merge block — use PRReview for that) |

### PRTimelineAction

```
submitted, review_requested, review_submitted, approved,
changes_requested, voted, auto_approved, merged, closed,
reopened, marked_draft, ready_for_review, label_added, label_removed
```

---

## 8. Role × Permission Matrix

Story-level roles from `StoryCollaboratorRole` with `ROLE_HIERARCHY`:

```
contributor: 0  →  reviewer: 1  →  moderator: 2  →  co_author: 3  →  owner: 4
```

### PR actions by role

| Action | contributor | reviewer | moderator | co_author | owner |
|---|:---:|:---:|:---:|:---:|:---:|
| Open a PR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own PR content (while draft) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mark own PR as draft / ready | ✓ | ✓ | ✓ | ✓ | ✓ |
| Close own PR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vote on any PR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reply to comments on own PR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Post PRComments on any PR | ✗ | ✓ | ✓ | ✓ | ✓ |
| Submit `feedback_only` PRReview | ✗ | ✓ | ✓ | ✓ | ✓ |
| Submit `approve` PRReview | ✗ | ✗ | ✓ | ✓ | ✓ |
| Submit `changes_requested` PRReview | ✗ | ✗ | ✓ | ✓ | ✓ |
| Merge PR (when canMerge = true) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Close any PR | ✗ | ✗ | ✓ | ✓ | ✓ |
| Reopen a closed PR | ✗ | ✗ | ✓ | ✓ | ✓ |
| Add / remove labels | ✗ | ✗ | ✓ | ✓ | ✓ |
| Resolve any comment | ✗ | ✗ | ✓ | ✓ | ✓ |
| Delete any comment | ✗ | ✗ | ✓ | ✓ | ✓ |
| Force-merge (override canMerge) | ✗ | ✗ | ✗ | ✓ | ✓ |
| Set approvalsStatus.required | ✗ | ✗ | ✗ | ✓ | ✓ |
| Configure autoApprove settings | ✗ | ✗ | ✗ | ✓ | ✓ |
| Review own PR | ✗ | ✗ | ✗ | ✗ | ✓ |
| Set required = 0 (skip reviews) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Hard-delete a PR | ✗ | ✗ | ✗ | ✗ | ✓ |

> `canForceMerge` is not yet in `STORY_COLLABORATOR_ROLE_CONFIG` — add it as `false` for moderator, `true` for co_author and owner.

---

## 9. Scenario Flows

### Scenario A — Standard review approval

```
1. Author submits PR
   → PullRequest created: status=open, approvalsStatus.received=0
   → PRTimeline: action=submitted

2. Reviewer posts feedback_only review
   → PRReview created: decision=feedback_only
   → No change to approvalsStatus
   → PRTimeline: action=review_submitted, metadata={ decision: 'feedback_only' }

3. Moderator approves
   → PRReview created: decision=approve
   → approvalsStatus.received++, approvers[] += moderatorId
   → If received >= required && blockers=[]: canMerge=true, status=approved
   → PRTimeline: action=approved

4. Co-author merges
   → status=merged, mergedAt=now, mergedBy=coAuthorId
   → PRTimeline: action=merged, metadata={ mergedBy, chapterSlug }
   → Chapter published to story
```

### Scenario B — Auto-approve via community votes

```
1. PR submitted with autoApprove.enabled=true, threshold=10, timeWindow=7

2. Community votes accumulate
   → Each vote: PRVote created/updated, PullRequest.votes recalculated
   → PRTimeline: action=voted, metadata={ vote, newScore }

3. votes.score reaches threshold (≥10) within 7 days
   → Guard: isDraft must be false
   → autoApprove.qualifiedAt=now, autoApprove.autoApprovedAt=now
   → status=approved
   → PRTimeline: action=auto_approved, performedBy=null, metadata={ votesReached, threshold }

4. System or moderator merges
   → status=merged
```

### Scenario C — Changes requested and resolved

```
1. Moderator submits changes_requested review
   → PRReview: decision=changes_requested
   → approvalsStatus.blockers += moderatorId
   → approvalsStatus.canMerge=false
   → PRTimeline: action=changes_requested

2. Author marks PR as draft, revises content
   → isDraft=true — auto-approve suspended
   → PRTimeline: action=marked_draft

3. Author marks ready for review
   → isDraft=false
   → PRTimeline: action=ready_for_review

4. Moderator updates their review to approve
   → PRReview updated: decision=approve, isUpdated=true, previousDecision=changes_requested
   → blockers -= moderatorId, approvers += moderatorId
   → Re-evaluate canMerge
   → PRTimeline: action=review_submitted, metadata={ decision: 'approve' }
```

### Scenario D — Vote flip

```
1. User upvotes: PRVote { vote: 1, previousVote: null }
   → PullRequest.votes.upvotes++, score: +1

2. Same user changes to downvote
   → PRVote updated: { vote: -1, previousVote: 1, changedAt: now }
   → Delta = newVote - oldVote = -1 - 1 = -2
   → PullRequest.votes.upvotes--, votes.downvotes++, score: -2 net
```

### Scenario E — PR closed and reopened

```
1. Author closes their own PR
   → status=closed, closedAt=now, closedBy=authorId, closeReason="Superseded"
   → PRTimeline: action=closed, metadata={ reason }

2. Owner decides to reopen
   → status=open, closedAt=null, closedBy=null, closeReason=null
   → PRTimeline: action=reopened
```

---

## 10. Service Layer Rules

These must be enforced in services — the model cannot enforce them alone.

### approvalsStatus.canMerge recalculation

Always recalculate after any review mutation:

```typescript
function recalculateCanMerge(approvalsStatus) {
  return (
    approvalsStatus.received >= approvalsStatus.required &&
    approvalsStatus.blockers.length === 0
  );
}
```

### Auto-approve guard — all three must pass

```typescript
function canAutoApprove(pr): boolean {
  if (!pr.autoApprove.enabled) return false;
  if (pr.isDraft) return false;
  const daysSinceCreation = (Date.now() - pr.createdAt) / 86_400_000;
  if (daysSinceCreation > pr.autoApprove.timeWindow) return false;
  return pr.votes.score >= pr.autoApprove.threshold;
}
```

### Self-review block

```typescript
function canSubmitReview(reviewerId: string, pr: IPullRequest, role: StoryCollaboratorRole): boolean {
  if (role === StoryCollaboratorRole.OWNER) return true;  // owner can self-review
  if (pr.authorId === reviewerId) return false;           // all others cannot
  return true;
}
```

### Decision permission check

```typescript
const VERDICT_DECISIONS = ['approve', 'changes_requested'];

function canSubmitDecision(role: StoryCollaboratorRole, decision: PRReviewDecision): boolean {
  if (decision === PRReviewDecision.FEEDBACK_ONLY) {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[StoryCollaboratorRole.REVIEWER];
  }
  // approve and changes_requested require moderator+
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[StoryCollaboratorRole.MODERATOR];
}
```

### Vote delta calculation

```typescript
function getVoteDelta(existingVote: number | null, newVote: number): number {
  if (existingVote === null) return newVote;   // first vote
  return newVote - existingVote;               // flip: +2 or -2
}
```

### PRTimeline — always write after mutations

Every service method that mutates PR state must append a `PRTimeline` event. This is the only way to reconstruct what happened. Use a MongoDB session to ensure the mutation and timeline write are atomic.

---

## 11. Key Design Decisions

### Why PRTimeline is a separate collection
The timeline was previously embedded as an array on `PullRequest`. This caused unbounded document growth and made pagination, filtering, and story-level activity feeds impossible without scanning all PRs. Each event is now its own document — immutable, independently queryable, and appended atomically with the mutation that caused it.

### Why `reject` was removed from PRReviewDecision
`reject` had no mechanical effect on `approvalsStatus` — it was a signal, not an action. Closing the PR with `closeReason` does the same job with better UX: it creates a visible terminal state in the UI, writes a richer `PRTimeline` event, and is more informative to the author than a review decision value that doesn't change the PR status.

### Why PRReview and PRComment are separate models
They look similar (both have `content`, both reference a PR and a user) but serve fundamentally different roles. `PRReview` is a **formal verdict** with mechanical effects on `approvalsStatus` — one per reviewer, updatable, affects merge eligibility. `PRComment` is **freeform discussion** with no mechanical effect — unlimited per user, supports threading, can be resolved. Merging them would require conditional uniqueness constraints and would leak approval logic into comment handling.

### Why `feedback_only` was added to PRReviewDecision
Without it, the `reviewer` role (level 1) has no way to submit a structured `PRReview` — every decision value either approves or blocks a merge, which they are not permitted to do. `feedback_only` gives reviewers a formal mechanism to submit scored, structured feedback that informs the moderator/co-author decision without affecting `approvalsStatus`.

### Why `storySlug` is denormalized on PRReview, PRComment, PRVote, PRTimeline
Story-level queries — "all reviews given in story X", "all PR activity this week in story Y" — would otherwise require joining through `PullRequest` first. Denormalizing `storySlug` onto every child document makes these queries a single index scan. The tradeoff is that if a story's slug ever changes, all child documents need updating — but story slugs are immutable in this system.

### Why contributor cannot comment on other PRs
`canReviewPRs: false` for contributors is intentional. Contributors are writers — they submit chapters and respond to feedback on their own PRs. Allowing them to comment on all PRs adds noise to the review queue without value and blurs the purpose of the reviewer role. If a contributor wants review access, they should be assigned the `reviewer` role.
