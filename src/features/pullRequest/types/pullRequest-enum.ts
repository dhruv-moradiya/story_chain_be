enum PRType {
  NEW_CHAPTER = 'new_chapter',
  EDIT_CHAPTER = 'edit_chapter',
  DELETE_CHAPTER = 'delete_chapter',
}

const PR_TYPES = ['new_chapter', 'edit_chapter', 'delete_chapter'] as const;

enum PRStatus {
  OPEN = 'open',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  MERGED = 'merged',
}

const PR_STATUSES = ['open', 'approved', 'rejected', 'closed', 'merged'] as const;

enum PRLabel {
  NEEDS_REVIEW = 'needs_review',
  QUALITY_ISSUE = 'quality_issue',
  GRAMMAR = 'grammar',
  PLOT_HOLE = 'plot_hole',
  GOOD_FIRST_PR = 'good_first_pr',
}

const PR_LABELS = [
  'needs_review',
  'quality_issue',
  'grammar',
  'plot_hole',
  'good_first_pr',
] as const;

export { PRType, PR_TYPES, PRStatus, PR_STATUSES, PRLabel, PR_LABELS };
