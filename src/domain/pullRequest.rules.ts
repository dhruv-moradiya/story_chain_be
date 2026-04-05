import {
  ROLE_HIERARCHY,
  STORY_COLLABORATOR_ROLE_CONFIG,
  StoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator-enum';
import { TStoryCollaboratorRole } from '@features/storyCollaborator/types/storyCollaborator.types';
import { IPullRequest } from '@features/pullRequest/types/pullRequest.types';
import { PRReviewDecision } from '@features/prReview/types/prReview-enum';
import { TPRReviewDecision } from '@features/prReview/types/prReview.types';
import { TStoryCollaboratorPermission } from '@features/storyCollaborator/types/storyCollaborator.types';

export interface IRuleResult {
  allowed: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function roleLevel(role: TStoryCollaboratorRole): number {
  return ROLE_HIERARCHY[role];
}

function hasPermission(
  role: TStoryCollaboratorRole,
  permission: TStoryCollaboratorPermission
): boolean {
  const config = STORY_COLLABORATOR_ROLE_CONFIG[role as StoryCollaboratorRole];
  if (!config) return false;
  return config.permissions[permission] === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// PullRequestRules
// ─────────────────────────────────────────────────────────────────────────────

export class PullRequestRules {
  // ── Status guards ──────────────────────────────────────────────────────────

  static isOpen(pr: IPullRequest): boolean {
    return pr.status === 'open';
  }

  static isMerged(pr: IPullRequest): boolean {
    return pr.status === 'merged';
  }

  static isTerminal(pr: IPullRequest): boolean {
    return pr.status === 'merged';
  }

  // ── Ownership ──────────────────────────────────────────────────────────────

  static isAuthor(pr: IPullRequest, userId: string): boolean {
    return pr.authorId === userId;
  }

  // ── PR metadata edits (title / description) ────────────────────────────────

  /**
   * Only the PR author can update title/description, and only while the PR is open.
   */
  static canUpdateMetadata(pr: IPullRequest, userId: string): IRuleResult {
    if (PullRequestRules.isTerminal(pr)) {
      return { allowed: false, reason: 'Cannot edit a merged pull request.' };
    }
    if (pr.status === 'closed') {
      return { allowed: false, reason: 'Cannot edit a closed pull request. Reopen it first.' };
    }
    if (!PullRequestRules.isAuthor(pr, userId)) {
      return { allowed: false, reason: 'Only the PR author can update title or description.' };
    }
    return { allowed: true };
  }

  // ── Draft toggle ────────────────────────────────────────────────────────────

  /**
   * Any collaborator role can mark their own PR as draft / ready_for_review,
   * but the PR must not be merged.
   */
  static canToggleDraft(pr: IPullRequest, userId: string): IRuleResult {
    if (PullRequestRules.isTerminal(pr)) {
      return { allowed: false, reason: 'Cannot change draft status of a merged pull request.' };
    }
    if (pr.status === 'closed') {
      return {
        allowed: false,
        reason: 'Cannot change draft status of a closed pull request. Reopen it first.',
      };
    }
    if (!PullRequestRules.isAuthor(pr, userId)) {
      return { allowed: false, reason: 'Only the PR author can change draft status.' };
    }
    return { allowed: true };
  }

  // ── Labels ──────────────────────────────────────────────────────────────────

  /**
   * Only moderator+ can add/remove labels.
   */
  static canManageLabels(role: TStoryCollaboratorRole | null): IRuleResult {
    if (!role) {
      return { allowed: false, reason: 'You must be a story collaborator to manage labels.' };
    }
    if (roleLevel(role) < roleLevel(StoryCollaboratorRole.MODERATOR)) {
      return {
        allowed: false,
        reason: 'Only moderators, co-authors, and owners can manage PR labels.',
      };
    }
    return { allowed: true };
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  /**
   * Check if a user can submit a review with a given decision.
   * Rules from PR_SYSTEM.md:
   * - feedback_only  → reviewer+
   * - approve / changes_requested → moderator+
   * - No self-review except owner
   */
  static canSubmitReview(
    pr: IPullRequest,
    reviewerId: string,
    role: TStoryCollaboratorRole | null,
    decision: TPRReviewDecision
  ): IRuleResult {
    if (!role) {
      return { allowed: false, reason: 'You must be a story collaborator to submit a review.' };
    }

    if (!PullRequestRules.isOpen(pr)) {
      return { allowed: false, reason: 'Reviews can only be submitted on open pull requests.' };
    }

    // Self-review: only owner is allowed
    if (PullRequestRules.isAuthor(pr, reviewerId) && role !== StoryCollaboratorRole.OWNER) {
      return { allowed: false, reason: 'You cannot review your own pull request.' };
    }

    if (decision === PRReviewDecision.FEEDBACK_ONLY) {
      if (roleLevel(role) < roleLevel(StoryCollaboratorRole.REVIEWER)) {
        return {
          allowed: false,
          reason: 'You must be at least a reviewer to submit feedback.',
        };
      }
      return { allowed: true };
    }

    // approve / changes_requested require moderator+
    if (roleLevel(role) < roleLevel(StoryCollaboratorRole.MODERATOR)) {
      return {
        allowed: false,
        reason: 'Only moderators, co-authors, and owners can approve or request changes.',
      };
    }

    return { allowed: true };
  }

  // ── Merge ──────────────────────────────────────────────────────────────────

  /**
   * Merge requires moderator+ role and either canMerge=true or canForceMerge permission.
   */
  static canMerge(pr: IPullRequest, role: TStoryCollaboratorRole | null): IRuleResult {
    if (!role) {
      return { allowed: false, reason: 'You must be a story collaborator to merge a PR.' };
    }

    if (pr.status !== 'open' && pr.status !== 'approved') {
      return {
        allowed: false,
        reason: `Pull request cannot be merged from status "${pr.status}".`,
      };
    }

    if (roleLevel(role) < roleLevel(StoryCollaboratorRole.MODERATOR)) {
      return { allowed: false, reason: 'Only moderators, co-authors, and owners can merge PRs.' };
    }

    const canForceMerge = hasPermission(role, 'canForceMerge');

    if (!pr.approvalsStatus.canMerge && !canForceMerge) {
      return {
        allowed: false,
        reason:
          'This PR is not yet approved (outstanding approvals or blockers). Only co-authors and owners can force-merge.',
      };
    }

    return { allowed: true };
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  /**
   * Who can post top-level comments:
   * - contributor: only on their own PR
   * - reviewer+: any PR
   */
  static canPostComment(
    pr: IPullRequest,
    userId: string,
    role: TStoryCollaboratorRole | null,
    parentCommentId: string | null
  ): IRuleResult {
    if (!role) {
      return { allowed: false, reason: 'You must be a story collaborator to post comments.' };
    }

    if (PullRequestRules.isTerminal(pr)) {
      return { allowed: false, reason: 'Cannot comment on a merged pull request.' };
    }

    // contributor can reply to any comment on their own PR; can post top-level only on their own PR
    if (role === StoryCollaboratorRole.CONTRIBUTOR) {
      if (!PullRequestRules.isAuthor(pr, userId)) {
        return {
          allowed: false,
          reason: 'Contributors can only comment on their own pull requests.',
        };
      }
      if (!parentCommentId) {
        // top-level comment on their own PR is fine per PR_SYSTEM.md
        return { allowed: true };
      }
      return { allowed: true };
    }

    // reviewer+ can comment on any PR
    if (roleLevel(role) < roleLevel(StoryCollaboratorRole.REVIEWER)) {
      return { allowed: false, reason: 'You do not have permission to comment on this PR.' };
    }

    return { allowed: true };
  }

  // ── approvalsStatus recalculation ──────────────────────────────────────────

  /**
   * Recalculate `canMerge` from the current approvalsStatus.
   * Must be called after every review mutation.
   */
  static recalculateCanMerge(approvalsStatus: IPullRequest['approvalsStatus']): boolean {
    return (
      approvalsStatus.received >= approvalsStatus.required && approvalsStatus.blockers.length === 0
    );
  }
}
