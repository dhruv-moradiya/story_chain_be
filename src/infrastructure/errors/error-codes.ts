/**
 * Error Codes for i18n Support
 *
 * These codes are used for:
 * 1. Frontend translation lookups
 * 2. Consistent error identification across the API
 * 3. Logging and monitoring categorization
 *
 * Format: {DOMAIN}_{ENTITY}_{ACTION}_{ERROR_TYPE}
 *
 * @example
 * - STORY_NOT_FOUND
 * - CHAPTER_CREATE_FAILED
 * - USER_ALREADY_COLLABORATOR
 * - AUTH_TOKEN_EXPIRED
 */

// ═══════════════════════════════════════════
// VALIDATION ERRORS
// ═══════════════════════════════════════════
export const VALIDATION_ERRORS = {
  // Generic validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_TYPE: 'INVALID_TYPE',
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',

  // Field-specific (pattern: FIELD_REQUIRED, FIELD_INVALID)
  SLUG_REQUIRED: 'SLUG_REQUIRED',
  SLUG_INVALID: 'SLUG_INVALID',
  STORY_SLUG_REQUIRED: 'STORY_SLUG_REQUIRED',
  CHAPTER_SLUG_REQUIRED: 'CHAPTER_SLUG_REQUIRED',
  USER_ID_REQUIRED: 'USER_ID_REQUIRED',
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  EMAIL_INVALID: 'EMAIL_INVALID',
  TITLE_REQUIRED: 'TITLE_REQUIRED',
  CONTENT_REQUIRED: 'CONTENT_REQUIRED',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  ROLE_INVALID: 'ROLE_INVALID',
  STATUS_REQUIRED: 'STATUS_REQUIRED',
  STATUS_INVALID: 'STATUS_INVALID',
} as const;

// ═══════════════════════════════════════════
// AUTHENTICATION & AUTHORIZATION ERRORS
// ═══════════════════════════════════════════
export const AUTH_ERRORS = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Authorization
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  NOT_OWNER: 'NOT_OWNER',
  NOT_COLLABORATOR: 'NOT_COLLABORATOR',
  NOT_MEMBER: 'NOT_MEMBER',
} as const;

// ═══════════════════════════════════════════
// RESOURCE ERRORS (Not Found, Conflict, etc.)
// ═══════════════════════════════════════════
export const RESOURCE_ERRORS = {
  // Generic
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  DELETED: 'DELETED',

  // Story
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  STORY_ALREADY_EXISTS: 'STORY_ALREADY_EXISTS',
  STORY_DELETED: 'STORY_DELETED',
  STORY_NOT_PUBLISHED: 'STORY_NOT_PUBLISHED',
  STORY_ALREADY_PUBLISHED: 'STORY_ALREADY_PUBLISHED',

  // Chapter
  CHAPTER_NOT_FOUND: 'CHAPTER_NOT_FOUND',
  CHAPTER_ALREADY_EXISTS: 'CHAPTER_ALREADY_EXISTS',
  CHAPTER_DELETED: 'CHAPTER_DELETED',
  CHAPTER_LOCKED: 'CHAPTER_LOCKED',
  PARENT_CHAPTER_NOT_FOUND: 'PARENT_CHAPTER_NOT_FOUND',

  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_DELETED: 'USER_DELETED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  INVITER_USER_NOT_FOUND: 'INVITER_USER_NOT_FOUND',
  INVITED_USER_NOT_FOUND: 'INVITED_USER_NOT_FOUND',

  // Collaborator
  COLLABORATOR_NOT_FOUND: 'COLLABORATOR_NOT_FOUND',
  COLLABORATOR_ALREADY_EXISTS: 'COLLABORATOR_ALREADY_EXISTS',
  USER_ALREADY_COLLABORATOR: 'USER_ALREADY_COLLABORATOR',
  USER_ALREADY_OWNER: 'USER_ALREADY_OWNER',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
  INVITATION_ALREADY_REJECTED: 'INVITATION_ALREADY_REJECTED',

  // Notification
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',

  // Comment
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',

  // AutoSave
  AUTOSAVE_NOT_FOUND: 'AUTOSAVE_NOT_FOUND',
  AUTOSAVE_EXPIRED: 'AUTOSAVE_EXPIRED',

  // Reading History
  READING_HISTORY_NOT_FOUND: 'READING_HISTORY_NOT_FOUND',

  // Pull Request
  PULL_REQUEST_NOT_FOUND: 'PULL_REQUEST_NOT_FOUND',
  PULL_REQUEST_ALREADY_MERGED: 'PULL_REQUEST_ALREADY_MERGED',
  PULL_REQUEST_ALREADY_CLOSED: 'PULL_REQUEST_ALREADY_CLOSED',
} as const;

// ═══════════════════════════════════════════
// BUSINESS LOGIC ERRORS
// ═══════════════════════════════════════════
export const BUSINESS_ERRORS = {
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',

  // Story Rules
  STORY_MAX_COLLABORATORS_REACHED: 'STORY_MAX_COLLABORATORS_REACHED',
  STORY_MAX_CHAPTERS_REACHED: 'STORY_MAX_CHAPTERS_REACHED',
  STORY_MAX_BRANCHES_REACHED: 'STORY_MAX_BRANCHES_REACHED',
  STORY_CANNOT_DELETE_WITH_CHAPTERS: 'STORY_CANNOT_DELETE_WITH_CHAPTERS',

  // Chapter Rules
  CHAPTER_MAX_DEPTH_REACHED: 'CHAPTER_MAX_DEPTH_REACHED',
  CHAPTER_CANNOT_MOVE: 'CHAPTER_CANNOT_MOVE',
  CHAPTER_CIRCULAR_REFERENCE: 'CHAPTER_CIRCULAR_REFERENCE',

  // Collaboration Rules
  CANNOT_INVITE_SELF: 'CANNOT_INVITE_SELF',
  CANNOT_REMOVE_OWNER: 'CANNOT_REMOVE_OWNER',
  CANNOT_CHANGE_OWNER_ROLE: 'CANNOT_CHANGE_OWNER_ROLE',
  CANNOT_ASSIGN_HIGHER_ROLE: 'CANNOT_ASSIGN_HIGHER_ROLE',
  CANNOT_SEND_INVITATION: 'CANNOT_SEND_INVITATION',

  // Feature Disabled
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
} as const;

// ═══════════════════════════════════════════
// DATABASE & SYSTEM ERRORS
// ═══════════════════════════════════════════
export const SYSTEM_ERRORS = {
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_DUPLICATE_KEY: 'DATABASE_DUPLICATE_KEY',
  DATABASE_VALIDATION_FAILED: 'DATABASE_VALIDATION_FAILED',
  DATABASE_CAST_ERROR: 'DATABASE_CAST_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // Redis/Cache
  CACHE_ERROR: 'CACHE_ERROR',
  CACHE_CONNECTION_FAILED: 'CACHE_CONNECTION_FAILED',

  // Queue
  QUEUE_ERROR: 'QUEUE_ERROR',
  JOB_FAILED: 'JOB_FAILED',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CLERK_ERROR: 'CLERK_ERROR',
  CLOUDINARY_ERROR: 'CLOUDINARY_ERROR',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',

  // Server
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ═══════════════════════════════════════════
// COMBINED ERROR CODES
// ═══════════════════════════════════════════
export const ERROR_CODE = {
  ...VALIDATION_ERRORS,
  ...AUTH_ERRORS,
  ...RESOURCE_ERRORS,
  ...BUSINESS_ERRORS,
  ...SYSTEM_ERRORS,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

// ═══════════════════════════════════════════
// DEFAULT ERROR MESSAGES (English)
// Used as fallback when i18n is not available
// ═══════════════════════════════════════════
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format',
  INVALID_TYPE: 'Invalid type',
  VALUE_TOO_SHORT: 'Value is too short',
  VALUE_TOO_LONG: 'Value is too long',
  VALUE_OUT_OF_RANGE: 'Value is out of allowed range',
  SLUG_REQUIRED: 'Slug is required',
  SLUG_INVALID: 'Slug format is invalid',
  STORY_SLUG_REQUIRED: 'Story slug is required',
  CHAPTER_SLUG_REQUIRED: 'Chapter slug is required',
  USER_ID_REQUIRED: 'User ID is required',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Email format is invalid',
  TITLE_REQUIRED: 'Title is required',
  CONTENT_REQUIRED: 'Content is required',
  ROLE_REQUIRED: 'Role is required',
  ROLE_INVALID: 'Invalid role specified',
  STATUS_REQUIRED: 'Status is required',
  STATUS_INVALID: 'Invalid status specified',

  // Auth
  UNAUTHORIZED: 'Authentication required',
  AUTH_TOKEN_MISSING: 'Authentication token is missing',
  AUTH_TOKEN_INVALID: 'Authentication token is invalid',
  AUTH_TOKEN_EXPIRED: 'Authentication token has expired',
  AUTH_SESSION_EXPIRED: 'Session has expired, please login again',
  AUTH_INVALID_CREDENTIALS: 'Invalid credentials',
  FORBIDDEN: 'Access denied',
  PERMISSION_DENIED: 'Permission denied',
  INSUFFICIENT_ROLE: 'Insufficient role for this action',
  NOT_OWNER: 'You are not the owner of this resource',
  NOT_COLLABORATOR: 'You are not a collaborator on this resource',
  NOT_MEMBER: 'You are not a member of this resource',

  // Resources
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  CONFLICT: 'Resource conflict occurred',
  DELETED: 'Resource has been deleted',
  STORY_NOT_FOUND: 'Story not found',
  STORY_ALREADY_EXISTS: 'Story already exists',
  STORY_DELETED: 'Story has been deleted',
  STORY_NOT_PUBLISHED: 'Story is not published',
  STORY_ALREADY_PUBLISHED: 'Story is already published',
  CHAPTER_NOT_FOUND: 'Chapter not found',
  CHAPTER_ALREADY_EXISTS: 'Chapter already exists',
  CHAPTER_DELETED: 'Chapter has been deleted',
  CHAPTER_LOCKED: 'Chapter is currently locked for editing',
  PARENT_CHAPTER_NOT_FOUND: 'Parent chapter not found',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_DELETED: 'User account has been deleted',
  USER_SUSPENDED: 'User account has been suspended',
  INVITER_USER_NOT_FOUND: 'Inviter user not found',
  INVITED_USER_NOT_FOUND: 'Invited user not found',
  COLLABORATOR_NOT_FOUND: 'Collaborator not found',
  COLLABORATOR_ALREADY_EXISTS: 'Collaborator already exists',
  USER_ALREADY_COLLABORATOR: 'User is already a collaborator',
  USER_ALREADY_OWNER: 'User is already the owner',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_EXPIRED: 'Invitation has expired',
  INVITATION_ALREADY_ACCEPTED: 'Invitation has already been accepted',
  INVITATION_ALREADY_REJECTED: 'Invitation has already been rejected',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  COMMENT_NOT_FOUND: 'Comment not found',
  AUTOSAVE_NOT_FOUND: 'Autosave not found',
  AUTOSAVE_EXPIRED: 'Autosave has expired',
  READING_HISTORY_NOT_FOUND: 'Reading history not found',
  PULL_REQUEST_NOT_FOUND: 'Pull request not found',
  PULL_REQUEST_ALREADY_MERGED: 'Pull request has already been merged',
  PULL_REQUEST_ALREADY_CLOSED: 'Pull request has already been closed',

  // Business
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  DAILY_LIMIT_REACHED: 'Daily limit has been reached',
  STORY_MAX_COLLABORATORS_REACHED: 'Maximum collaborators limit reached',
  STORY_MAX_CHAPTERS_REACHED: 'Maximum chapters limit reached',
  STORY_MAX_BRANCHES_REACHED: 'Maximum branches limit reached',
  STORY_CANNOT_DELETE_WITH_CHAPTERS: 'Cannot delete story with existing chapters',
  CHAPTER_MAX_DEPTH_REACHED: 'Maximum chapter depth reached',
  CHAPTER_CANNOT_MOVE: 'Chapter cannot be moved',
  CHAPTER_CIRCULAR_REFERENCE: 'Circular reference detected',
  CANNOT_INVITE_SELF: 'Cannot invite yourself',
  CANNOT_REMOVE_OWNER: 'Cannot remove the owner',
  CANNOT_CHANGE_OWNER_ROLE: 'Cannot change owner role',
  CANNOT_ASSIGN_HIGHER_ROLE: 'Cannot assign a role higher than your own',
  CANNOT_SEND_INVITATION: 'You do not have permission to send invitations',
  FEATURE_DISABLED: 'This feature is currently disabled',
  FEATURE_NOT_AVAILABLE: 'This feature is not available',

  // System
  DATABASE_ERROR: 'Database error occurred',
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  DATABASE_QUERY_FAILED: 'Database query failed',
  DATABASE_DUPLICATE_KEY: 'Duplicate key error',
  DATABASE_VALIDATION_FAILED: 'Database validation failed',
  DATABASE_CAST_ERROR: 'Invalid data type',
  DATABASE_TIMEOUT: 'Database operation timed out',
  TRANSACTION_FAILED: 'Transaction failed',
  CACHE_ERROR: 'Cache error occurred',
  CACHE_CONNECTION_FAILED: 'Cache connection failed',
  QUEUE_ERROR: 'Queue error occurred',
  JOB_FAILED: 'Job processing failed',
  EXTERNAL_SERVICE_ERROR: 'External service error',
  CLERK_ERROR: 'Authentication service error',
  CLOUDINARY_ERROR: 'Media service error',
  EMAIL_SEND_FAILED: 'Failed to send email',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  TIMEOUT_ERROR: 'Request timed out',
  UNKNOWN_ERROR: 'An unknown error occurred',
};

/**
 * Get default message for an error code
 */
export function getDefaultMessage(code: ErrorCode): string {
  return DEFAULT_ERROR_MESSAGES[code] || 'An error occurred';
}
