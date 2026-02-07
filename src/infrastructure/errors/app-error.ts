import { HTTP_STATUS } from '@constants/httpStatus';
import { ErrorCode, getDefaultMessage } from './error-codes.js';

/**
 * Application-specific error with i18n support
 *
 * @description
 * AppError extends the standard Error class with:
 * - Error code for i18n lookups
 * - HTTP status code for API responses
 * - Field name for validation errors
 * - Additional context data
 * - Operational flag to distinguish recoverable errors
 *
 * @example
 * throw new AppError('STORY_NOT_FOUND', 404);
 * throw new AppError('SLUG_REQUIRED', 400, { field: 'slug' });
 * throw new AppError('DATABASE_ERROR', 500, { isOperational: false });
 */
export class AppError extends Error {
  public readonly success: boolean = false;
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly field?: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    statusCode: number = 500,
    options: {
      message?: string;
      field?: string;
      details?: Record<string, unknown>;
      isOperational?: boolean;
      stack?: string;
    } = {}
  ) {
    // Use custom message or get default from error code
    const message = options.message || getDefaultMessage(code);
    super(message);

    this.code = code;
    this.statusCode = statusCode;
    this.field = options.field;
    this.details = options.details;
    this.isOperational = options.isOperational ?? statusCode < 500;
    this.timestamp = new Date();

    if (options.stack) {
      this.stack = options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Serialize error for API response
   */
  toJSON(isDevelopment: boolean = false): {
    success: boolean;
    code: ErrorCode;
    message: string;
    statusCode: number;
    field?: string;
    details?: Record<string, unknown>;
    data: null;
    stack?: string;
    timestamp?: string;
  } {
    const response: ReturnType<AppError['toJSON']> = {
      success: this.success,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      data: null,
    };

    if (this.field) {
      response.field = this.field;
    }

    if (this.details && Object.keys(this.details).length > 0) {
      response.details = this.details;
    }

    if (isDevelopment) {
      response.stack = this.stack;
      response.timestamp = this.timestamp.toISOString();
    }

    return response;
  }

  // ═══════════════════════════════════════════
  // VALIDATION ERROR FACTORIES
  // ═══════════════════════════════════════════

  static validation(
    code: ErrorCode,
    options?: { message?: string; field?: string; details?: Record<string, unknown> }
  ): AppError {
    return new AppError(code, HTTP_STATUS.UNPROCESSABLE_ENTITY.code, options);
  }

  static fieldRequired(field: string): AppError {
    const fieldCode = `${field.toUpperCase()}_REQUIRED` as ErrorCode;
    return new AppError(fieldCode, HTTP_STATUS.BAD_REQUEST.code, {
      message: `${field} is required`,
      field,
    });
  }

  static fieldInvalid(field: string, message?: string): AppError {
    const fieldCode = `${field.toUpperCase()}_INVALID` as ErrorCode;
    return new AppError(fieldCode, HTTP_STATUS.BAD_REQUEST.code, {
      message: message || `${field} is invalid`,
      field,
    });
  }

  // ═══════════════════════════════════════════
  // AUTH ERROR FACTORIES
  // ═══════════════════════════════════════════

  static unauthorized(code: ErrorCode = 'UNAUTHORIZED', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.UNAUTHORIZED.code, { message });
  }

  static forbidden(code: ErrorCode = 'FORBIDDEN', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.FORBIDDEN.code, { message });
  }

  static permissionDenied(message?: string): AppError {
    return new AppError('PERMISSION_DENIED', HTTP_STATUS.FORBIDDEN.code, { message });
  }

  static insufficientRole(message?: string): AppError {
    return new AppError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN.code, { message });
  }

  // ═══════════════════════════════════════════
  // RESOURCE ERROR FACTORIES
  // ═══════════════════════════════════════════

  static notFound(code: ErrorCode = 'NOT_FOUND', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.NOT_FOUND.code, { message });
  }

  static storyNotFound(slug?: string): AppError {
    return new AppError('STORY_NOT_FOUND', HTTP_STATUS.NOT_FOUND.code, {
      message: slug ? `Story not found: ${slug}` : undefined,
      details: slug ? { slug } : undefined,
    });
  }

  static chapterNotFound(slug?: string): AppError {
    return new AppError('CHAPTER_NOT_FOUND', HTTP_STATUS.NOT_FOUND.code, {
      message: slug ? `Chapter not found: ${slug}` : undefined,
      details: slug ? { slug } : undefined,
    });
  }

  static userNotFound(identifier?: string): AppError {
    return new AppError('USER_NOT_FOUND', HTTP_STATUS.NOT_FOUND.code, {
      message: identifier ? `User not found: ${identifier}` : undefined,
    });
  }

  static collaboratorNotFound(): AppError {
    return new AppError('COLLABORATOR_NOT_FOUND', HTTP_STATUS.NOT_FOUND.code);
  }

  static conflict(code: ErrorCode = 'CONFLICT', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.CONFLICT.code, { message });
  }

  static alreadyExists(code: ErrorCode = 'ALREADY_EXISTS', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.CONFLICT.code, { message });
  }

  // ═══════════════════════════════════════════
  // BUSINESS LOGIC ERROR FACTORIES
  // ═══════════════════════════════════════════

  static rateLimitExceeded(retryAfter?: number): AppError {
    return new AppError('RATE_LIMIT_EXCEEDED', HTTP_STATUS.TOO_MANY_REQUESTS.code, {
      details: retryAfter ? { retryAfter } : undefined,
    });
  }

  static cannotInviteSelf(): AppError {
    return new AppError('CANNOT_INVITE_SELF', HTTP_STATUS.BAD_REQUEST.code, {
      message: 'You cannot invite yourself as a collaborator',
    });
  }

  static cannotAssignHigherRole(currentRole: string, targetRole: string): AppError {
    return new AppError('CANNOT_ASSIGN_HIGHER_ROLE', HTTP_STATUS.FORBIDDEN.code, {
      message: `Cannot assign role '${targetRole}' because it is higher than your role '${currentRole}'`,
      details: { currentRole, targetRole },
    });
  }

  static userAlreadyCollaborator(): AppError {
    return new AppError('USER_ALREADY_COLLABORATOR', HTTP_STATUS.CONFLICT.code, {
      message: 'User is already a collaborator on this story',
    });
  }

  static userAlreadyOwner(): AppError {
    return new AppError('USER_ALREADY_OWNER', HTTP_STATUS.CONFLICT.code, {
      message: 'User is already the owner of this story',
    });
  }

  static cannotSendInvitation(): AppError {
    return new AppError('CANNOT_SEND_INVITATION', HTTP_STATUS.FORBIDDEN.code, {
      message: 'You do not have permission to send invitations for this story',
    });
  }

  // ═══════════════════════════════════════════
  // SYSTEM ERROR FACTORIES
  // ═══════════════════════════════════════════

  static internal(message?: string): AppError {
    return new AppError('INTERNAL_SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR.code, {
      message,
      isOperational: false,
    });
  }

  static database(code: ErrorCode = 'DATABASE_ERROR', message?: string): AppError {
    return new AppError(code, HTTP_STATUS.INTERNAL_SERVER_ERROR.code, {
      message,
      isOperational: false,
    });
  }

  static serviceUnavailable(message?: string): AppError {
    return new AppError('SERVICE_UNAVAILABLE', HTTP_STATUS.SERVICE_UNAVAILABLE.code, {
      message,
      isOperational: false,
    });
  }

  static externalService(service: string, message?: string): AppError {
    return new AppError('EXTERNAL_SERVICE_ERROR', HTTP_STATUS.BAD_GATEWAY.code, {
      message: message || `External service error: ${service}`,
      details: { service },
      isOperational: false,
    });
  }

  // ═══════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════

  /**
   * Check if an error is an AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Create AppError from unknown error
   */
  static from(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError('UNKNOWN_ERROR', 500, {
        message: error.message,
        stack: error.stack,
        isOperational: false,
      });
    }

    return new AppError('UNKNOWN_ERROR', 500, {
      message: String(error),
      isOperational: false,
    });
  }
}
