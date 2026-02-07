import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '@utils/apiResponse.js';
import { AppError } from '@infrastructure/errors/app-error.js';
import { ErrorCode } from '@infrastructure/errors/error-codes.js';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '@constants/httpStatus.js';
import { Error as MongooseError } from 'mongoose';

/**
 * Convert Zod validation error to ApiError with proper error code
 */
export function handleZodError(error: ZodError): ApiError {
  const issues = error.issues;

  // Single field error
  if (issues.length === 1) {
    const issue = issues[0];
    const field = issue.path.join('.') || 'value';

    // Try to get a specific error code for the field
    let code: ErrorCode = 'VALIDATION_FAILED';
    if (
      issue.code === 'invalid_type' &&
      (issue.received === 'undefined' || issue.received === 'null')
    ) {
      // Field is missing/required
      const upperField = field.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const requiredCode = `${upperField}_REQUIRED` as ErrorCode;
      code = requiredCode;
    }

    return new ApiError(code, HTTP_STATUS.UNPROCESSABLE_ENTITY.code, `${field}: ${issue.message}`, {
      field,
      details: { path: issue.path, code: issue.code },
    });
  }

  // Multiple validation errors
  const fieldErrors = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  const message = `Validation failed: ${fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`;

  return new ApiError('VALIDATION_FAILED', HTTP_STATUS.UNPROCESSABLE_ENTITY.code, message, {
    details: { errors: fieldErrors },
  });
}

/**
 * Convert Mongoose error to ApiError with proper error code
 */
function handleMongooseError(error: Error): ApiError {
  // Mongoose Validation Error
  if (error instanceof MongooseError.ValidationError) {
    const fields = Object.keys(error.errors);

    if (fields.length === 1) {
      const field = fields[0];
      const err = error.errors[field];
      return new ApiError(
        'DATABASE_VALIDATION_FAILED',
        400,
        `Validation failed for ${field}: ${err.message}`,
        {
          field,
          details: { kind: err.kind, value: err.value },
        }
      );
    }

    const fieldErrors = fields.map((field) => ({
      field,
      message: error.errors[field].message,
      kind: error.errors[field].kind,
    }));

    return new ApiError(
      'DATABASE_VALIDATION_FAILED',
      400,
      `Validation failed: ${fields.join(', ')}`,
      {
        details: { errors: fieldErrors },
      }
    );
  }

  // Mongoose Cast Error (invalid ObjectId, etc.)
  if (error instanceof MongooseError.CastError) {
    return new ApiError(
      'DATABASE_CAST_ERROR',
      400,
      `Invalid ${error.kind} for field '${error.path}'`,
      {
        field: error.path,
        details: { kind: error.kind, value: String(error.value) },
      }
    );
  }

  // MongoDB Duplicate Key Error
  const err = error as unknown as Record<string, unknown>;
  if (err.code === 11000 || err.code === 11001) {
    let field: string | undefined;
    if (err.keyPattern && typeof err.keyPattern === 'object') {
      field = Object.keys(err.keyPattern)[0];
    }
    return new ApiError(
      'DATABASE_DUPLICATE_KEY',
      409,
      field ? `Duplicate value for field: ${field}` : 'Duplicate key error',
      {
        field,
        details: { keyPattern: err.keyPattern },
      }
    );
  }

  // MongoDB Timeout Error
  if (
    error.name === 'MongoTimeoutError' ||
    error.name === 'MongoServerSelectionError' ||
    error.message.includes('timed out')
  ) {
    return new ApiError('DATABASE_TIMEOUT', 504, 'Database operation timed out', {
      isOperational: false,
    });
  }

  // Generic database error
  return new ApiError('DATABASE_ERROR', 500, error.message, {
    isOperational: false,
  });
}

/**
 * Global Error Handling Middleware
 *
 * Handles all error types and returns consistent JSON responses with error codes
 */
export function globalErrorHandler(isDevelopment: boolean = false) {
  return (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    // Log error for monitoring
    request.log.error(error);

    // ----------------------------------------------------
    // 1. ApiError (our primary error class with codes)
    // ----------------------------------------------------
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(error.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 2. AppError (infrastructure error class)
    // ----------------------------------------------------
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 3. Zod Validation Error
    // ----------------------------------------------------
    if (error instanceof ZodError) {
      const apiError = handleZodError(error);
      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 4. Mongoose Errors
    // ----------------------------------------------------
    if (
      error instanceof MongooseError.ValidationError ||
      error instanceof MongooseError.CastError
    ) {
      const apiError = handleMongooseError(error);
      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // MongoDB Server Errors (duplicate key, etc.)
    if (
      typeof error === 'object' &&
      error !== null &&
      ((error as Record<string, unknown>).name === 'MongoServerError' ||
        (error as Record<string, unknown>).name === 'MongoError' ||
        (error as Record<string, unknown>).code === 11000 ||
        (error as Record<string, unknown>).code === 11001)
    ) {
      const apiError = handleMongooseError(error as Error);
      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 5. Fastify Built-in Validation Error (schema validation)
    // ----------------------------------------------------
    if (
      typeof error === 'object' &&
      error !== null &&
      'validation' in error &&
      Array.isArray((error as Record<string, unknown>).validation)
    ) {
      const err = error as FastifyError & { validationContext?: string };
      const context = err.validationContext || 'body';
      const message = err.message || HTTP_STATUS.UNPROCESSABLE_ENTITY.message;

      const validationError = new ApiError(
        'VALIDATION_FAILED',
        HTTP_STATUS.UNPROCESSABLE_ENTITY.code,
        `${context} validation failed: ${message}`,
        { details: { context, validation: (error as Record<string, unknown>).validation } }
      );

      return reply.code(validationError.statusCode).send(validationError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 6. FastifyError or HttpError with statusCode
    // ----------------------------------------------------
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as Record<string, unknown>).statusCode === 'number'
    ) {
      const err = error as FastifyError;

      const status =
        typeof err.statusCode === 'number'
          ? err.statusCode
          : HTTP_STATUS.INTERNAL_SERVER_ERROR.code;

      // Determine error code based on status
      let code: ErrorCode = 'UNKNOWN_ERROR';
      if (status === 400) code = 'INVALID_INPUT';
      else if (status === 401) code = 'UNAUTHORIZED';
      else if (status === 403) code = 'FORBIDDEN';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 409) code = 'CONFLICT';
      else if (status === 422) code = 'VALIDATION_FAILED';
      else if (status === 429) code = 'RATE_LIMIT_EXCEEDED';
      else if (status >= 500) code = 'INTERNAL_SERVER_ERROR';

      const apiError = new ApiError(
        code,
        status,
        err.message || HTTP_STATUS.INTERNAL_SERVER_ERROR.message,
        { isOperational: status < 500, stack: err.stack }
      );

      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 7. Unknown or Unexpected Error (Catch-all)
    // ----------------------------------------------------
    const unknownMessage = error instanceof Error ? error.message : String(error);

    const internalError = new ApiError(
      'INTERNAL_SERVER_ERROR',
      HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
      isDevelopment ? `Unexpected error: ${unknownMessage}` : 'An unexpected error occurred',
      {
        isOperational: false,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return reply.code(internalError.statusCode).send(internalError.toJSON(isDevelopment));
  };
}
