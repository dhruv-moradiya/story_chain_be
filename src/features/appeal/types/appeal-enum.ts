export enum AppealScope {
  PLATFORM = 'PLATFORM',
  STORY = 'STORY',
}

export const APPEAL_SCOPES = [AppealScope.PLATFORM, AppealScope.STORY] as const;

// PENDING      → submitted, awaiting assignment
// UNDER_REVIEW → assigned to a moderator, actively being reviewed
// APPROVED     → appeal accepted; ban will be / has been lifted
// REJECTED     → appeal denied; ban remains
// ESCALATED    → passed to a higher authority (e.g. SUPER_ADMIN)
// WITHDRAWN    → appellant voluntarily withdrew the appeal

export enum AppealStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  WITHDRAWN = 'WITHDRAWN',
}

export const APPEAL_STATUSES = [
  AppealStatus.PENDING,
  AppealStatus.UNDER_REVIEW,
  AppealStatus.APPROVED,
  AppealStatus.REJECTED,
  AppealStatus.ESCALATED,
  AppealStatus.WITHDRAWN,
] as const;

export enum AppealPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export const APPEAL_PRIORITIES = [
  AppealPriority.LOW,
  AppealPriority.NORMAL,
  AppealPriority.HIGH,
  AppealPriority.URGENT,
] as const;

// Past-tense to match terminal AppealStatus values for consistency.

export enum AppealReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export const APPEAL_REVIEW_DECISIONS = [
  AppealReviewDecision.APPROVED,
  AppealReviewDecision.REJECTED,
  AppealReviewDecision.ESCALATED,
] as const;
