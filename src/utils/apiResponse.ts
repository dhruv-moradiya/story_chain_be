import { HTTP_STATUS, HttpStatusKey } from '@constants/httpStatus.js';

/**
 * Response codes for i18n support
 * These codes can be used by the frontend for translations
 */
export type SuccessCode =
  | 'SUCCESS'
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'FETCHED'
  | 'NO_CONTENT'
  | 'ACCEPTED';

export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly code: SuccessCode;
  public readonly message: string;
  public readonly data: T | null;

  constructor(
    success: boolean = true,
    codeOrMessage: SuccessCode | string,
    messageOrData?: string | T | null,
    data?: T | null
  ) {
    this.success = success;

    // Detect if using new signature (code, message, data) or old signature (message, data)
    if (this.isSuccessCode(codeOrMessage)) {
      // New signature: (success, code, message, data)
      this.code = codeOrMessage;
      this.message = (messageOrData as string) || '';
      this.data = data ?? null;
    } else {
      // Legacy signature: (success, message, data)
      this.code = 'SUCCESS';
      this.message = codeOrMessage;
      this.data = (messageOrData as T) ?? null;
    }
  }

  private isSuccessCode(value: string): value is SuccessCode {
    const validCodes: SuccessCode[] = [
      'SUCCESS',
      'CREATED',
      'UPDATED',
      'DELETED',
      'FETCHED',
      'NO_CONTENT',
      'ACCEPTED',
    ];
    return validCodes.includes(value as SuccessCode);
  }

  static success<T>(
    data: T,
    statusKey: HttpStatusKey = 'OK',
    customMessage?: string,
    code: SuccessCode = 'SUCCESS'
  ): ApiResponse<T> {
    const status = HTTP_STATUS[statusKey];
    return new ApiResponse<T>(true, code, customMessage || status.message, data);
  }

  static created<T>(data: T, customMessage?: string): ApiResponse<T> {
    return ApiResponse.success<T>(data, 'CREATED', customMessage, 'CREATED');
  }

  static updated<T>(data: T, customMessage?: string): ApiResponse<T> {
    return ApiResponse.success<T>(data, 'OK', customMessage || 'Updated successfully', 'UPDATED');
  }

  static deleted(customMessage?: string): ApiResponse<null> {
    return ApiResponse.success<null>(
      null,
      'OK',
      customMessage || 'Deleted successfully',
      'DELETED'
    );
  }

  static fetched<T>(data: T, customMessage?: string): ApiResponse<T> {
    return ApiResponse.success<T>(data, 'OK', customMessage || 'Fetched successfully', 'FETCHED');
  }

  static noContent(customMessage?: string): ApiResponse<null> {
    const status = HTTP_STATUS.NO_CONTENT;
    return new ApiResponse<null>(true, 'NO_CONTENT', customMessage || status.message, null);
  }
}

// ═══════════════════════════════════════════
// ERROR CODES - Re-exported from infrastructure for convenience
// ═══════════════════════════════════════════
import { ErrorCode, getDefaultMessage } from '@infrastructure/errors/error-codes.js';

export { ErrorCode };

/**
 * ApiError with i18n-ready error codes
 *
 * @example
 * throw ApiError.notFound('STORY_NOT_FOUND', 'Story not found');
 * throw ApiError.badRequest('STORY_SLUG_REQUIRED', 'Story slug is required');
 *
 * // Legacy usage (still supported):
 * throw ApiError.notFound('Story not found');
 */
export class ApiError extends Error {
  public readonly success: boolean = false;
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly field?: string;
  public readonly details?: Record<string, unknown>;
  public readonly stack?: string;

  constructor(
    codeOrStatusCode: ErrorCode | number,
    statusCodeOrMessage?: number | string,
    messageOrOptions?:
      | string
      | {
          isOperational?: boolean;
          field?: string;
          details?: Record<string, unknown>;
          stack?: string;
        },
    options?: {
      isOperational?: boolean;
      field?: string;
      details?: Record<string, unknown>;
      stack?: string;
    }
  ) {
    // Detect signature:
    // New: (code: ErrorCode, statusCode: number, message?: string, options?: {...})
    // Legacy: (statusCode: number, message: string, isOperational?: boolean, stack?: string)

    let code: ErrorCode;
    let statusCode: number;
    let message: string;
    let opts: {
      isOperational?: boolean;
      field?: string;
      details?: Record<string, unknown>;
      stack?: string;
    } = {};

    if (typeof codeOrStatusCode === 'string') {
      // New signature: ErrorCode first
      code = codeOrStatusCode as ErrorCode;
      statusCode = statusCodeOrMessage as number;
      message = typeof messageOrOptions === 'string' ? messageOrOptions : getDefaultMessage(code);
      opts = (typeof messageOrOptions === 'object' ? messageOrOptions : options) || {};
    } else {
      // Legacy signature: statusCode first
      statusCode = codeOrStatusCode;
      message = statusCodeOrMessage as string;
      code = ApiError.statusCodeToErrorCode(statusCode);

      // Handle legacy options
      if (typeof messageOrOptions === 'boolean') {
        opts.isOperational = messageOrOptions;
      }
      if (typeof options === 'object' && 'stack' in options) {
        opts.stack = options.stack as string;
      } else if (typeof options === 'string') {
        opts.stack = options;
      }
    }

    super(message || getDefaultMessage(code));
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = opts.isOperational ?? statusCode < 500;
    this.field = opts.field;
    this.details = opts.details;

    if (opts.stack) {
      this.stack = opts.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Map status code to a default error code
   */
  private static statusCodeToErrorCode(statusCode: number): ErrorCode {
    switch (statusCode) {
      case 400:
        return 'INVALID_INPUT';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_FAILED';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 502:
        return 'EXTERNAL_SERVICE_ERROR';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  // ---------- Common Error Factories ----------

  static badRequest(
    codeOrMessage?: ErrorCode | string,
    message?: string,
    field?: string
  ): ApiError {
    const status = HTTP_STATUS.BAD_REQUEST;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      // Legacy: badRequest('Some message')
      return new ApiError('INVALID_INPUT', status.code, codeOrMessage, { field });
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'INVALID_INPUT', status.code, message, {
      field,
    });
  }

  static validationError(
    codeOrMessage?: ErrorCode | string,
    message?: string,
    details?: Record<string, unknown>
  ): ApiError {
    const status = HTTP_STATUS.VALIDATION_ERROR;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('VALIDATION_FAILED', status.code, codeOrMessage, { details });
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'VALIDATION_FAILED', status.code, message, {
      details,
    });
  }

  static unauthorized(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.UNAUTHORIZED;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('UNAUTHORIZED', status.code, codeOrMessage);
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'UNAUTHORIZED', status.code, message);
  }

  static forbidden(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.FORBIDDEN;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('FORBIDDEN', status.code, codeOrMessage);
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'FORBIDDEN', status.code, message);
  }

  static notFound(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.NOT_FOUND;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('NOT_FOUND', status.code, codeOrMessage);
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'NOT_FOUND', status.code, message);
  }

  static methodNotAllowed(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.METHOD_NOT_ALLOWED;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('NOT_FOUND', status.code, codeOrMessage);
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'NOT_FOUND', status.code, message);
  }

  static conflict(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.CONFLICT;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('CONFLICT', status.code, codeOrMessage);
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'CONFLICT', status.code, message);
  }

  static unprocessableEntity(
    codeOrMessage?: ErrorCode | string,
    message?: string,
    details?: Record<string, unknown>
  ): ApiError {
    const status = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('VALIDATION_FAILED', status.code, codeOrMessage, { details });
    }
    return new ApiError((codeOrMessage as ErrorCode) || 'VALIDATION_FAILED', status.code, message, {
      details,
    });
  }

  static tooManyRequests(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.TOO_MANY_REQUESTS;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('RATE_LIMIT_EXCEEDED', status.code, codeOrMessage);
    }
    return new ApiError(
      (codeOrMessage as ErrorCode) || 'RATE_LIMIT_EXCEEDED',
      status.code,
      message
    );
  }

  static badGateway(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.BAD_GATEWAY;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('EXTERNAL_SERVICE_ERROR', status.code, codeOrMessage, {
        isOperational: false,
      });
    }
    return new ApiError(
      (codeOrMessage as ErrorCode) || 'EXTERNAL_SERVICE_ERROR',
      status.code,
      message,
      { isOperational: false }
    );
  }

  static internalError(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('INTERNAL_SERVER_ERROR', status.code, codeOrMessage, {
        isOperational: false,
      });
    }
    return new ApiError(
      (codeOrMessage as ErrorCode) || 'INTERNAL_SERVER_ERROR',
      status.code,
      message,
      { isOperational: false }
    );
  }

  static serviceUnavailable(codeOrMessage?: ErrorCode | string, message?: string): ApiError {
    const status = HTTP_STATUS.SERVICE_UNAVAILABLE;
    if (codeOrMessage && !isErrorCode(codeOrMessage)) {
      return new ApiError('SERVICE_UNAVAILABLE', status.code, codeOrMessage, {
        isOperational: false,
      });
    }
    return new ApiError(
      (codeOrMessage as ErrorCode) || 'SERVICE_UNAVAILABLE',
      status.code,
      message,
      { isOperational: false }
    );
  }

  // ---------- Utility ----------

  toJSON(isDevelopment: boolean = false) {
    const errorResponse: {
      success: boolean;
      code: ErrorCode;
      message: string;
      statusCode: number;
      data: null;
      field?: string;
      details?: Record<string, unknown>;
      stack?: string;
    } = {
      success: this.success,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      data: null,
    };

    if (this.field) {
      errorResponse.field = this.field;
    }

    if (this.details && Object.keys(this.details).length > 0) {
      errorResponse.details = this.details;
    }

    if (isDevelopment && this.stack) {
      errorResponse.stack = this.stack;
    }

    return errorResponse;
  }
}

/**
 * Check if a string is an error code (UPPER_SNAKE_CASE)
 */
function isErrorCode(value: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/.test(value);
}
