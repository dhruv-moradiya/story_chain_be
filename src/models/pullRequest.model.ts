import mongoose, { Schema } from 'mongoose';
import { IPullRequestDoc } from '@features/pullRequest/types/pullRequest.types';
import {
  PR_LABELS,
  PR_STATUSES,
  PR_TYPES,
  PRStatus,
  PRType,
} from '@features/pullRequest/types/pullRequest-enum';

const pullRequestSchema = new Schema<IPullRequestDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    // References
    storySlug: {
      type: String,
      required: true,
      index: true,
    },
    chapterSlug: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * PARENT_CHAPTER_SLUG: Which chapter is this branching from?
     * USE: For branch management, understand the chapter tree
     * UPDATE: Set once on creation for branching PRs
     * REFERENCE: Links to parent Chapter in story structure
     * NOTE: For edits to main chapter, this equals chapterSlug
     */
    parentChapterSlug: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },

    // ==================== PR TYPE ====================

    /**
     * PR_TYPE: What kind of change is this?
     * VALUES:
     *   - NEW_CHAPTER: Adding entirely new chapter
     *   - EDIT_CHAPTER: Modifying existing chapter
     *   - DELETE_CHAPTER: Removing a chapter
     * USE: Determine how to apply changes when merged, different review criteria
     * UPDATE: Set once on creation, never changes
     * LOGIC: Affects merge behavior:
     *   - NEW_CHAPTER: Create new chapter from proposed content
     *   - EDIT_CHAPTER: Replace chapter content with proposed
     *   - DELETE_CHAPTER: Mark chapter as deleted (soft delete)
     */
    prType: {
      type: String,
      enum: PR_TYPES,
      default: PRType.NEW_CHAPTER,
    },

    // ==================== CHANGES ====================
    /**
     * CHANGES: The actual content modifications
     */
    changes: {
      /**
       * ORIGINAL: Previous content (for comparison)
       * USE: Generate diff, show what changed, in PRDiff service
       * UPDATE: Set once on creation
       * STORE: Only if EDIT_CHAPTER or DELETE_CHAPTER (NEW_CHAPTER has no original)
       * SIZE: Can be large, consider storing in separate collection if > 1MB
       */
      original: {
        type: String,
        maxlength: 100000,
      },

      /**
       * PROPOSED: New content being suggested
       * USE: What will be applied to chapter if PR merges
       * UPDATE: Can be updated by author before first review
       * REQUIRED: Always present - this is the main change
       * SIZE: Can be large, capped at 100KB to prevent abuse
       */
      proposed: {
        type: String,
        required: true,
        maxlength: 100000,
      },

      /**
       * DIFF: Unified diff format showing line-by-line changes
       * USE: Display visual diff in UI, easier code review
       * UPDATE: Generated automatically from original vs proposed
       * FORMAT: Standard unified diff (-, +, @ markers)
       * GENERATE: On PR creation in PRService.createPR()
       * SIZE: Usually 10-20% of original size
       * EXAMPLE: "- old line\n+ new line\n  unchanged line"
       */
      diff: {
        type: String,
        maxlength: 100000,
      },

      /**
       * LINE_COUNT: Total lines in diff
       * USE: Quick stat for UI, helps gauge change size
       * UPDATE: Calculated on creation from diff
       * CALCULATE: Count all lines in diff including context
       */
      lineCount: Number,

      /**
       * ADDITIONS_COUNT: Number of lines added
       * USE: Quick stat showing additions
       * UPDATE: Calculated on creation
       * CALCULATE: Count lines starting with '+' in diff
       */
      additionsCount: Number,

      /**
       * DELETIONS_COUNT: Number of lines deleted
       * USE: Quick stat showing deletions
       * UPDATE: Calculated on creation
       * CALCULATE: Count lines starting with '-' in diff
       */
      deletionsCount: Number,
    },

    // ==================== STATUS ====================

    /**
     * STATUS: Main PR status (terminal states)
     * VALUES:
     *   - OPEN: Initial state, under review or waiting for reviews
     *   - APPROVED: All required reviews received and approved
     *   - REJECTED: Explicitly rejected, cannot be merged
     *   - CLOSED: Manually closed without merging
     *   - MERGED: Successfully merged into story
     * USE: Filter PRs, determine actions available
     * UPDATE:
     *   - On creation: OPEN
     *   - When all approvals received: APPROVED
     *   - When force-closed: CLOSED
     *   - When merged: MERGED
     * INDEX: Heavily queried - include in compound indexes
     * FLOW: OPEN -> APPROVED -> MERGED (or OPEN -> CLOSED, or OPEN -> REJECTED)
     */
    status: {
      type: String,
      enum: PR_STATUSES,
      default: PRStatus.OPEN,
      required: true,
      index: true,
    },

    // ==================== VOTING AGGREGATE ====================
    /**
     * VOTES: Vote counts (actual votes stored in separate PRVote schema)
     * WHY SEPARATE: Allows efficient querying, prevents document bloat,
     *               enables vote tracking and analytics
     * UPDATE: Aggregated from PRVote collection
     * USE: Quick access to vote counts without joining PRVote
     */
    votes: {
      /**
       * UPVOTES: Count of positive votes
       * USE: Show community approval
       * UPDATE: Increment/decrement when PRVote added/removed
       * SYNC: Keep in sync with PRVote count via PRService.syncVoteCounts()
       */
      upvotes: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
      },

      /**
       * DOWNVOTES: Count of negative votes
       * USE: Show community concerns
       * UPDATE: Increment/decrement when PRVote added/removed
       * SYNC: Keep in sync with PRVote count
       */
      downvotes: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * SCORE: Net vote score (upvotes - downvotes)
       * USE: Ranking PRs by community support, auto-approval trigger
       * UPDATE: Calculated as upvotes - downvotes
       * CALCULATE: upvotes - downvotes
       * INDEX: Used for sorting PRs by popularity
       * AUTO_APPROVE_TRIGGER: When score >= autoApprove.threshold
       */
      score: {
        type: Number,
        default: 0,
        index: true,
      },
    },

    // ==================== COMMENT COUNT AGGREGATE ====================
    /**
     * COMMENT_COUNT: Number of comments on PR
     * WHY SEPARATE SCHEMA: Comments stored in PRComment schema for:
     *   - Scalability (PRs can have 1000s of comments)
     *   - Efficient pagination
     *   - Separate comment threading
     *   - Better indexing on comments
     * USE: Show activity level, quick stat in UI
     * UPDATE: Increment when PRComment created, decrement on delete
     * SYNC: Keep in sync with actual PRComment count via cron or hook
     */
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    // ==================== AUTO-APPROVAL CONFIG ====================
    /**
     * AUTO_APPROVE: Configuration for automatic approval
     * USE: Allow PRs to merge automatically when conditions met
     * WHEN_TO_USE: Enable for trusted contributors, simple PRs
     * DEFAULT: Disabled (requires manual approval)
     */
    autoApprove: {
      /**
       * ENABLED: Is auto-approval active for this PR?
       * DEFAULT: false (manual approval required)
       * UPDATE: Set per PR or inherit from story settings
       * DISABLE: Can be overridden by STORY_CREATOR if needed
       */
      enabled: {
        type: Boolean,
        default: false,
      },

      /**
       * THRESHOLD: Vote count required to auto-approve
       * UNIT: Net votes (upvotes - downvotes)
       * DEFAULT: 10 (can be customized per story)
       * UPDATE: Set on creation from story settings
       * LOGIC: If votes.score >= threshold, auto-approve
       * EXAMPLE: threshold=10 means need 10+ more upvotes than downvotes
       */
      threshold: {
        type: Number,
        default: 10,
        min: 1,
      },

      /**
       * TIME_WINDOW: Days to accumulate votes before auto-approval
       * UNIT: Days
       * DEFAULT: 7 (votes must accumulate within one week)
       * UPDATE: Set on creation from story settings
       * LOGIC: PR can only auto-approve if created <= timeWindow days ago
       * PREVENTS: Very old PRs auto-approving after months
       * EXAMPLE: timeWindow=7 means PR created more than 7 days ago won't auto-approve
       */
      timeWindow: {
        type: Number,
        default: 7,
        min: 1,
      },

      /**
       * QUALIFIED_AT: When did PR first qualify for auto-approval?
       * USE: Track when auto-approval became possible
       * UPDATE: Set once when score reaches threshold
       * LOCK: Once set, can only auto-approve if still in timeWindow
       */
      qualifiedAt: Date,

      /**
       * AUTO_APPROVED_AT: When was auto-approval actually applied?
       * USE: Know when/if automatic approval happened
       * UPDATE: Set when auto-approval logic executes
       * EMPTY: If null, means PR hasn't auto-approved yet (might not qualify)
       */
      autoApprovedAt: Date,
    },

    // ==================== LABELS ====================
    /**
     * LABELS: Tags to categorize PR
     * USE: Filter PRs in UI, organize review queue
     * UPDATE: Add/remove by STORY_CREATOR or MODERATOR
     * CONSTRAINTS: Limited set of allowed labels
     * PREDEFINED_LABELS:
     *   - NEEDS_REVIEW: Still needs reviewer attention
     *   - QUALITY_ISSUE: Content quality concerns flagged
     *   - GRAMMAR: Grammar/spelling issues noted
     *   - PLOT_HOLE: Story inconsistency detected
     *   - GOOD_FIRST_PR: Good for new contributors to review
     */
    labels: [
      {
        type: String,
        enum: PR_LABELS,
      },
    ],

    // ==================== MERGE INFO ====================
    /**
     * MERGED_AT: When was this PR merged?
     * USE: Know if/when PR was merged
     * UPDATE: Set when PR merged (status changed to MERGED)
     * EMPTY: null if status != MERGED
     * IMMUTABLE: Once set, never changes
     */
    mergedAt: Date,

    /**
     * MERGED_BY: Who performed the merge?
     * USE: Track who merged the PR (could be author, reviewer, or system)
     * UPDATE: Set when PR merged
     * PERMISSIONS: Must be EDITOR+ to merge
     * VALUE: System if auto-merged
     */
    mergedBy: {
      type: String,
      ref: 'User',
    },

    /**
     * CLOSED_AT: When was this PR closed without merging?
     * USE: Track closed PRs
     * UPDATE: Set when PR closed (status changed to CLOSED)
     * EMPTY: null if status != CLOSED
     */
    closedAt: Date,

    /**
     * CLOSED_BY: Who closed the PR?
     * USE: Track who made the decision to close
     * UPDATE: Set when PR closed
     * PERMISSIONS: Author or STORY_CREATOR can close
     */
    closedBy: {
      type: String,
      ref: 'User',
    },

    /**
     * CLOSE_REASON: Why was this PR closed?
     * USE: Document reason for closure (superceded, duplicate, etc)
     * UPDATE: Set when PR closed
     * EXAMPLE: "Duplicate of PR #123", "Changes no longer needed"
     */
    closeReason: {
      type: String,
      maxlength: 500,
    },

    /**
     * IS_DRAFT: Has author paused review?
     * USE: Prevent auto-approval while in draft
     * UPDATE:
     *   - Set true: When author calls markAsDraft()
     *   - Set false: When author calls markReadyForReview()
     * EFFECT: If true, PR won't auto-approve even if threshold met
     * REASON: Author needs more time before review
     */
    isDraft: {
      type: Boolean,
      default: false,
    },

    /**
     * DRAFT_REASON: Why did author pause review?
     * USE: Inform reviewers of delay reason
     * UPDATE: Set when marked as draft
     * EXAMPLE: "Working on feedback", "Waiting for story context"
     */
    draftReason: String,

    /**
     * DRAFTED_AT: When was PR marked as draft?
     * USE: Know how long PR has been paused
     * UPDATE: Set when marked as draft
     */
    draftedAt: Date,

    // ==================== TIMELINE ====================
    /**
     * TIMELINE: High-level action history
     * USE: Show PR lifecycle: created -> reviewed -> approved -> merged
     * UPDATE: Append new entry for each major action
     * SEPARATE: Detailed reviews/comments in separate schemas
     * ACTIONS:
     *   - CREATED: PR submitted
     *   - REVIEW_REQUESTED: Reviewer assigned
     *   - REVIEW_SUBMITTED: Reviewer decision received
     *   - APPROVED: All approvals received
     *   - CHANGES_REQUESTED: Changes needed
     *   - VOTED: User voted
     *   - AUTO_APPROVED: Voted to approval threshold
     *   - MERGED: PR merged to story
     *   - CLOSED: PR closed without merge
     *   - REOPENED: Closed PR was reopened
     *   - MARKED_DRAFT: Author paused review
     *   - READY_FOR_REVIEW: Author resumed review
     */
    timeline: [
      {
        /**
         * ACTION: What happened?
         * VALUES: CREATED, REVIEW_SUBMITTED, APPROVED, MERGED, etc
         */
        action: {
          type: String,
          required: true,
        },

        /**
         * PERFORMED_BY: Who did it?
         * USER_ID: The user who initiated action
         * SYSTEM: null if system-generated (auto-approval)
         */
        performedBy: String,

        /**
         * PERFORMED_AT: When did it happen?
         * USE: Build timeline visualization
         */
        performedAt: {
          type: Date,
          default: Date.now,
        },

        /**
         * METADATA: Extra context for this action
         * USE: Store action-specific details
         * EXAMPLES:
         *   - On REVIEW_SUBMITTED: { decision: 'APPROVE', score: 4.5 }
         *   - On AUTO_APPROVED: { votesReached: 12, threshold: 10 }
         *   - On MERGED: { byUser: 'mod1', version: 2 }
         */
        metadata: Schema.Types.Mixed,
      },
    ],

    // ==================== STATS ====================
    /**
     * STATS: Engagement and performance metrics
     */
    stats: {
      /**
       * VIEWS: How many times was PR viewed?
       * USE: Measure interest/engagement
       * UPDATE: Increment when PR page loaded
       * CAVEAT: Browser cache might undercount views
       */
      views: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * DISCUSSIONS: Number of discussion threads?
       * USE: Gauge how much back-and-forth discussion
       * UPDATE: Increment when comment thread created
       * RELATIONSHIP: Related to commentCount but different metric
       */
      discussions: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * REVIEWS_RECEIVED: How many reviews were submitted?
       * USE: Quick stat of review count
       * UPDATE: Count actual reviews in PRReview schema
       * SYNC: Keep in sync via PRService.syncReviewCount()
       */
      reviewsReceived: {
        type: Number,
        default: 0,
        min: 0,
      },

      /**
       * TIME_TO_MERGE: How long from creation to merge?
       * UNIT: Minutes
       * USE: Track approval speed, performance metric
       * CALCULATE: (mergedAt - createdAt) / 60000
       * EMPTY: null if not merged yet
       * ANALYSIS: Long timeToMerge might indicate approval issues
       */
      timeToMerge: Number,

      /**
       * AVG_REVIEW_TIME: Average time per reviewer took to review
       * UNIT: Minutes
       * USE: Performance metric for reviewers
       * CALCULATE: Avg of (review.createdAt - previous_action.time)
       */
      avgReviewTime: Number,
    },

    // ==================== APPROVAL STATUS ====================
    /**
     * APPROVALS_STATUS: Track required vs received approvals
     * USE: Know if PR ready to merge
     * UPDATE: When review submitted, voted, changes requested
     */
    approvalsStatus: {
      /**
       * REQUIRED: How many approvals needed?
       * DEFAULT: Usually 1 or 2 (configured per story)
       * UPDATE: Set on creation from story settings
       * SOURCE: Pulled from story.settings.prSettings.minApprovals
       */
      required: {
        type: Number,
        default: 1,
      },

      /**
       * RECEIVED: How many approvals received so far?
       * USE: Track progress toward merge
       * UPDATE: Increment when APPROVE review submitted
       * DECREMENT: If approval withdrawn/changed
       */
      received: {
        type: Number,
        default: 0,
      },

      /**
       * PENDING: How many more approvals needed?
       * CALCULATE: required - received
       * USE: Quick check - if 0, ready to merge
       * READONLY: Calculated field, not directly set
       */
      pending: {
        type: Number,
        default: 0,
      },

      /**
       * APPROVERS: List of users who approved
       * USE: Show who approved in timeline
       * UPDATE: Add reviewerId when APPROVE review added
       * REMOVE: If approval withdrawn
       */
      approvers: [String],

      /**
       * BLOCKERS: Users who requested changes (blocking approval)
       * USE: Show who blocked merge, visual indicator
       * UPDATE: Add reviewerId when REQUEST_CHANGES review added
       * CLEAR: Remove when author addresses changes/blocker withdraws
       */
      blockers: [String],

      /**
       * CAN_MERGE: Is PR ready to merge right now?
       * CALCULATE: received >= required && blockers.length === 0
       * USE: Enable/disable merge button in UI
       * READONLY: Computed field
       */
      canMerge: {
        type: Boolean,
        default: false,
      },
    },

    // ==================== MODERATION ====================
    /**
     * REQUIRES_MODERATION: Should moderation team review?
     * USE: Flag for content policy violations
     * UPDATE: Set by auto-detection or manual flag
     */
    requiresModeration: {
      type: Boolean,
      default: false,
    },

    /**
     * FLAGGED_FOR_REVIEW: Manual flag by moderator
     * USE: Mark for manual review
     * UPDATE: By MODERATOR+ when content looks suspicious
     */
    flaggedForReview: {
      type: Boolean,
      default: false,
    },

    /**
     * MODERATION_NOTES: Why was this flagged?
     * USE: Document moderation concerns
     * UPDATE: Set when flagged for review
     * EXAMPLE: "Contains potential harassment", "Copyright concern"
     */
    moderationNotes: String,

    /**
     * REPORT_IDS: Related moderation reports
     * USE: Link to Report documents
     * UPDATE: When report filed against PR content
     */
    reportIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],

    // ==================== CONFLICT TRACKING ====================
    /**
     * HAS_CONFLICTS: Does this PR conflict with others?
     * USE: Alert reviewers of merge conflicts
     * UPDATE: Calculated when checking merge eligibility
     */
    // hasConflicts: {
    //   type: Boolean,
    //   default: false,
    // },

    /**
     * CONFLICT_DESCRIPTION: What conflicts exist?
     * USE: Document nature of conflicts
     * UPDATE: When conflicts detected
     * EXAMPLE: "Conflicts with PR #5 on lines 10-20"
     */
    // conflictDescription: String,

    /**
     * CONFLICT_RESOLVED_AT: When were conflicts resolved?
     * USE: Track resolution
     * UPDATE: When author resolves conflicts
     */
    // conflictResolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
pullRequestSchema.index({ storySlug: 1, status: 1, createdAt: -1 });
pullRequestSchema.index({ authorId: 1, status: 1 });
pullRequestSchema.index({ 'votes.score': -1 });

const PullRequest = mongoose.model<IPullRequestDoc>('PullRequest', pullRequestSchema);

export { PullRequest };
