enum ChapterStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PENDING_REVIEW = 'pending_review',
}

const CHAPTER_STATUSES = ['draft', 'published', 'pending_review'] as const;

enum ChapterPRStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MERGED = 'merged',
}

const CHAPTER_PR_STATUSES = ['pending', 'approved', 'rejected', 'merged'] as const;

export { ChapterStatus, CHAPTER_STATUSES, ChapterPRStatus, CHAPTER_PR_STATUSES };
