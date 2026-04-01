import { TPRType } from '@features/pullRequest/types/pullRequest.types';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs for PR creation APIs (used by PullRequestCommandService)
// ─────────────────────────────────────────────────────────────────────────────

export interface ICreatePRFromDraftDTO {
  chapterSlug: string;
  storySlug: string;
  title: string;
  description?: string;
  parentChapterSlug?: string;
  prType: TPRType;
  isDraft?: boolean;
  draftReason?: string;
  authorId: string;
}

export interface ICreatePRFromAutoSaveDTO {
  autoSaveId: string;
  title: string;
  description?: string;
  parentChapterSlug?: string;
  prType: TPRType;
  isDraft?: boolean;
  draftReason?: string;
  authorId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs for PR management APIs
// ─────────────────────────────────────────────────────────────────────────────

// 1. Update title / description
export interface IUpdatePRMetadataDTO {
  prId: string;
  userId: string;
  title?: string;
  description?: string;
}

// 2. Toggle draft status
export interface ITogglePRDraftDTO {
  prId: string;
  userId: string;
  /** true = mark as draft, false = mark as ready for review */
  isDraft: boolean;
  draftReason?: string;
}

// 3. Update labels
export interface IUpdatePRLabelsDTO {
  prId: string;
  storySlug: string;
  userId: string;
  /** Full replacement of the labels array */
  labels: string[];
}

// 4. Submit review
export interface ISubmitPRReviewDTO {
  prId: string;
  storySlug: string;
  reviewerId: string;
  decision: string;
  summary: string;
  overallRating?: number;
}

// 5. Merge PR
export interface IMergePRDTO {
  prId: string;
  storySlug: string;
  userId: string;
}

// 6. Add comment
export interface IAddPRCommentDTO {
  prId: string;
  storySlug: string;
  userId: string;
  content: string;
  parentCommentId?: string;
}
