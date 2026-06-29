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

const FREE_CHAPTERS_LIMIT = 2;

const CHAPTER_PRICE = {
  FREE: 0,
  PAID: 7,
};

const CHAPTER_PRICES = [0, 7] as const;

export {
  ChapterStatus,
  CHAPTER_STATUSES,
  ChapterPRStatus,
  FREE_CHAPTERS_LIMIT,
  CHAPTER_PR_STATUSES,
  CHAPTER_PRICE,
  CHAPTER_PRICES,
};
