enum PRReviewDecision {
  APPROVE = 'approve',
  CHANGES_REQUESTED = 'changes_requested',
  FEEDBACK_ONLY = 'feedback_only',
}

const PR_REVIEW_DECISIONS = ['approve', 'changes_requested', 'feedback_only'] as const;

export { PRReviewDecision, PR_REVIEW_DECISIONS };
