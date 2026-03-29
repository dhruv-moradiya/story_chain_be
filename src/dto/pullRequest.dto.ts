import { TPRType } from '@features/pullRequest/types/pullRequest.types';

// ─────────────────────────────────────────────────────────────────────────────
// Create PR from Draft Chapter
// ─────────────────────────────────────────────────────────────────────────────
export interface ICreatePRFromDraftDTO {
  /** The draft chapter slug to create the PR from */
  chapterSlug: string;
  /** The story this PR belongs to */
  storySlug: string;
  /** PR title */
  title: string;
  /** Optional author's note / description */
  description?: string;
  /** The chapter being branched from / proposed edit target */
  parentChapterSlug: string;
  /** PR type */
  prType: TPRType;
  /** Whether to submit as draft PR (hidden from queue) */
  isDraft?: boolean;
  /** Reason for draft state */
  draftReason?: string;
  /** Authenticated user's clerkId */
  authorId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create PR from AutoSave
// ─────────────────────────────────────────────────────────────────────────────
export interface ICreatePRFromAutoSaveDTO {
  /** The autoSave document _id */
  autoSaveId: string;
  /** PR title */
  title: string;
  /** Optional author's note / description */
  description?: string;
  /** The chapter being branched from / proposed edit target */
  parentChapterSlug: string;
  /** PR type */
  prType: TPRType;
  /** Whether to submit as draft PR */
  isDraft?: boolean;
  /** Reason for draft state */
  draftReason?: string;
  /** Authenticated user's clerkId */
  authorId: string;
}
