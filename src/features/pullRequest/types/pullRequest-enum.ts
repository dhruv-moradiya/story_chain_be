enum PRType {
  NEW_BRANCH = 'new_branch',
  CONTINUATION = 'continuation',
  EDIT = 'edit',
}

const PR_TYPES = ['new_branch', 'continuation', 'edit'] as const;

enum PRStatus {
  OPEN = 'open',
  APPROVED = 'approved',
  CLOSED = 'closed',
  MERGED = 'merged',
}

const PR_STATUSES = ['open', 'approved', 'closed', 'merged'] as const;

enum PRLabel {
  NEEDS_REVIEW = 'needs_review',
  QUALITY_ISSUE = 'quality_issue',
  GRAMMAR = 'grammar',
  PLOT_HOLE = 'plot_hole',
  LORE_INCONSISTENCY = 'lore_inconsistency',
  CONFLICT = 'conflict',
  DUPLICATE = 'duplicate',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  GOOD_FIRST_PR = 'good_first_pr',
}

const PR_LABELS = [
  'needs_review',
  'quality_issue',
  'grammar',
  'plot_hole',
  'lore_inconsistency',
  'conflict',
  'duplicate',
  'changes_requested',
  'approved',
  'good_first_pr',
] as const;

enum PRTimelineAction {
  SUBMITTED = 'submitted',
  REVIEW_REQUESTED = 'review_requested',
  REVIEW_SUBMITTED = 'review_submitted',
  APPROVED = 'approved',
  CHANGES_REQUESTED = 'changes_requested',
  VOTED = 'voted',
  AUTO_APPROVED = 'auto_approved',
  MERGED = 'merged',
  CLOSED = 'closed',
  REOPENED = 'reopened',
  MARKED_DRAFT = 'marked_draft',
  READY_FOR_REVIEW = 'ready_for_review',
  LABEL_ADDED = 'label_added',
  LABEL_REMOVED = 'label_removed',
}

const PR_TIMELINE_ACTIONS = [
  'submitted',
  'review_requested',
  'review_submitted',
  'approved',
  'changes_requested',
  'voted',
  'auto_approved',
  'merged',
  'closed',
  'reopened',
  'marked_draft',
  'ready_for_review',
  'label_added',
  'label_removed',
] as const;

export {
  PRType,
  PR_TYPES,
  PRStatus,
  PR_STATUSES,
  PRLabel,
  PR_LABELS,
  PRTimelineAction,
  PR_TIMELINE_ACTIONS,
};
