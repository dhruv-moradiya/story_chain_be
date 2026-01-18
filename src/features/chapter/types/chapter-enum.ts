enum ChapterStatus {
  PUBLISHED = 'published',
  PENDING_APPROVAL = 'pending_approval',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

const CHAPTER_STATUSES = ['published', 'pending_approval', 'rejected', 'deleted'] as const;

enum ChapterPRStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MERGED = 'merged',
}

const CHAPTER_PR_STATUSES = ['pending', 'approved', 'rejected', 'merged'] as const;

export { ChapterStatus, CHAPTER_STATUSES, ChapterPRStatus, CHAPTER_PR_STATUSES };
