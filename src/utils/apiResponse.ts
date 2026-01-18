import { HTTP_STATUS, HttpStatusKey } from '@constants/httpStatus';

export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data: T | null;
  // public readonly statusCode: number;

  constructor(success: boolean = true, message: string, data: T | null = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    // this.statusCode = statusCode;
  }

  static success<T>(
    data: T,
    statusKey: HttpStatusKey = 'OK',
    customMessage?: string
  ): ApiResponse<T> {
    const status = HTTP_STATUS[statusKey];
    return new ApiResponse<T>(true, customMessage || status.message, data);
  }

  static created<T>(data: T, customMessage?: string): ApiResponse<T> {
    return ApiResponse.success<T>(data, 'CREATED', customMessage);
  }

  static noContent(customMessage?: string): ApiResponse<null> {
    const status = HTTP_STATUS.NO_CONTENT;
    return new ApiResponse<null>(true, customMessage || status.message, null);
  }
}

export class ApiError extends Error {
  public readonly success: boolean = false;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly stack?: string;

  constructor(statusCode: number, message: string, isOperational: boolean = true, stack?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ---------- Common Error Factories ----------

  static badRequest(message?: string): ApiError {
    const status = HTTP_STATUS.BAD_REQUEST;
    return new ApiError(status.code, message || status.message);
  }

  static validationError(message?: string): ApiError {
    const status = HTTP_STATUS.VALIDATION_ERROR;
    return new ApiError(status.code, message || status.message);
  }

  static unauthorized(message?: string): ApiError {
    const status = HTTP_STATUS.UNAUTHORIZED;
    return new ApiError(status.code, message || status.message);
  }

  static forbidden(message?: string): ApiError {
    const status = HTTP_STATUS.FORBIDDEN;
    return new ApiError(status.code, message || status.message);
  }

  static notFound(message?: string): ApiError {
    const status = HTTP_STATUS.NOT_FOUND;
    return new ApiError(status.code, message || status.message);
  }

  static methodNotAllowed(message?: string): ApiError {
    const status = HTTP_STATUS.METHOD_NOT_ALLOWED;
    return new ApiError(status.code, message || status.message);
  }

  static conflict(message?: string): ApiError {
    const status = HTTP_STATUS.CONFLICT;
    return new ApiError(status.code, message || status.message);
  }

  static unprocessableEntity(message?: string): ApiError {
    const status = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    return new ApiError(status.code, message || status.message);
  }

  static tooManyRequests(message?: string): ApiError {
    const status = HTTP_STATUS.TOO_MANY_REQUESTS;
    return new ApiError(status.code, message || status.message);
  }

  static badGateway(message?: string): ApiError {
    const status = HTTP_STATUS.BAD_GATEWAY;
    return new ApiError(status.code, message || status.message, false);
  }

  static internalError(message?: string): ApiError {
    const status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return new ApiError(status.code, message || status.message, false);
  }

  static serviceUnavailable(message?: string): ApiError {
    const status = HTTP_STATUS.SERVICE_UNAVAILABLE;
    return new ApiError(status.code, message || status.message, false);
  }

  // ---------- Utility ----------

  toJSON(isDevelopment: boolean = false) {
    const errorResponse: {
      success: boolean;
      message: string;
      statusCode: number;
      data: null;
      stack?: string;
    } = {
      success: this.success,
      message: this.message,
      statusCode: this.statusCode,
      data: null,
    };

    if (isDevelopment && this.stack) {
      errorResponse.stack = this.stack;
    }

    return errorResponse;
  }
}
