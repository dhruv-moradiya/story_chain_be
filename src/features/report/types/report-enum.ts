export enum ReportType {
  CHAPTER = 'CHAPTER',
  COMMENT = 'COMMENT',
  USER = 'USER',
  STORY = 'STORY',
}

export const REPORT_TYPES = [
  ReportType.CHAPTER,
  ReportType.COMMENT,
  ReportType.USER,
  ReportType.STORY,
] as const;

export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  VIOLENCE = 'VIOLENCE',
  COPYRIGHT = 'COPYRIGHT',
  MISINFORMATION = 'MISINFORMATION',
  IMPERSONATION = 'IMPERSONATION',
  UNDERAGE_CONTENT = 'UNDERAGE_CONTENT',
  OFF_TOPIC = 'OFF_TOPIC',
  OTHER = 'OTHER',
}

export const REPORT_REASONS = [
  ReportReason.SPAM,
  ReportReason.HARASSMENT,
  ReportReason.INAPPROPRIATE_CONTENT,
  ReportReason.VIOLENCE,
  ReportReason.COPYRIGHT,
  ReportReason.MISINFORMATION,
  ReportReason.IMPERSONATION,
  ReportReason.UNDERAGE_CONTENT,
  ReportReason.OFF_TOPIC,
  ReportReason.OTHER,
] as const;

// PENDING      → submitted, not yet opened by any moderator
// UNDER_REVIEW → moderator has opened and is actively reviewing
// RESOLVED     → action was taken (ban, delete, warning)
// DISMISSED    → found invalid or no policy violation
// ESCALATED    → passed from story level up to platform level

export enum ReportStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
  ESCALATED = 'ESCALATED',
}

export const REPORT_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.UNDER_REVIEW,
  ReportStatus.RESOLVED,
  ReportStatus.DISMISSED,
  ReportStatus.ESCALATED,
] as const;

export enum ReportGovernanceLevel {
  STORY = 'STORY',
  PLATFORM = 'PLATFORM',
}

export enum ReportActionTaken {
  // Story-level actions
  DELETE_COMMENT = 'DELETE_COMMENT',
  FLAG_CHAPTER = 'FLAG_CHAPTER',
  BAN_FROM_STORY = 'BAN_FROM_STORY',
  // Platform-level actions
  DELETE_CONTENT = 'DELETE_CONTENT',
  GLOBAL_BAN = 'GLOBAL_BAN',
  OFFICIAL_WARNING = 'OFFICIAL_WARNING',
  // No action
  NONE = 'NONE',
}

export const REPORT_ACTIONS_TAKEN = [
  ReportActionTaken.DELETE_COMMENT,
  ReportActionTaken.FLAG_CHAPTER,
  ReportActionTaken.BAN_FROM_STORY,
  ReportActionTaken.DELETE_CONTENT,
  ReportActionTaken.GLOBAL_BAN,
  ReportActionTaken.OFFICIAL_WARNING,
  ReportActionTaken.NONE,
] as const;
