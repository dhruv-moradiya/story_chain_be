enum PRReviewStatus {
  PENDING_REVIEW = 'pending_review',
  IN_REVIEW = 'in_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  NEEDS_WORK = 'needs_work',
  DRAFT = 'draft',
}

const PR_REVIEW_STATUSES = [
  'pending_review',
  'in_review',
  'changes_requested',
  'approved',
  'needs_work',
  'draft',
] as const;

export { PRReviewStatus, PR_REVIEW_STATUSES };
