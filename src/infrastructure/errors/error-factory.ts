import { Error as MongooseError } from 'mongoose';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from './app-error.js';
import { ErrorCode, ERROR_CODE } from './error-codes.js';

/**
 * ErrorFactory - Converts various error types to AppError
 *
 * Handles:
 * - Zod validation errors (schema validation)
 * - Mongoose errors (database operations)
 * - Fastify errors (request handling)
 * - Generic JavaScript errors
 */
export class ErrorFactory {
  // ═══════════════════════════════════════════
  // ZOD ERROR HANDLING
  // ═══════════════════════════════════════════

  /**
   * Convert Zod validation error to AppError
   *
   * @example
   * try {
   *   schema.parse(data);
   * } catch (error) {
   *   if (error instanceof ZodError) {
   *     throw ErrorFactory.fromZod(error);
   *   }
   * }
   */
  static fromZod(error: ZodError): AppError {
    const issues = error.issues;

    if (issues.length === 1) {
      return this.fromZodIssue(issues[0]);
    }

    // Multiple validation errors
    const fieldErrors = issues.map((issue) => ({
      field: issue.path.join('.'),
      code: this.zodIssueToCode(issue),
      message: issue.message,
    }));

    return new AppError('VALIDATION_FAILED', 422, {
      message: `Validation failed: ${fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`,
      details: { errors: fieldErrors },
    });
  }

  /**
   * Convert single Zod issue to AppError
   */
  private static fromZodIssue(issue: ZodIssue): AppError {
    const field = issue.path.join('.') || 'value';
    const code = this.zodIssueToCode(issue);

    return new AppError(code, 400, {
      message: `${field}: ${issue.message}`,
      field,
      details: {
        received: 'received' in issue ? issue.received : undefined,
        expected: 'expected' in issue ? issue.expected : undefined,
      },
    });
  }

  /**
   * Map Zod issue code to app error code
   */
  private static zodIssueToCode(issue: ZodIssue): ErrorCode {
    const field = issue.path[issue.path.length - 1];
    const fieldUpper = typeof field === 'string' ? field.toUpperCase() : '';

    switch (issue.code) {
      case 'invalid_type':
        if (issue.received === 'undefined' || issue.received === 'null') {
          // Check if we have a specific FIELD_REQUIRED code
          const requiredCode = `${fieldUpper}_REQUIRED` as ErrorCode;
          if (requiredCode in ERROR_CODE) {
            return requiredCode;
          }
          return 'MISSING_REQUIRED_FIELD';
        }
        return 'INVALID_TYPE';

      case 'invalid_string': {
        const invalidCode = `${fieldUpper}_INVALID` as ErrorCode;
        if (invalidCode in ERROR_CODE) {
          return invalidCode;
        }
        return 'INVALID_FORMAT';
      }

      case 'too_small':
        return 'VALUE_TOO_SHORT';

      case 'too_big':
        return 'VALUE_TOO_LONG';

      case 'invalid_enum_value':
        return 'INVALID_INPUT';

      default:
        return 'VALIDATION_FAILED';
    }
  }

  // ═══════════════════════════════════════════
  // MONGOOSE ERROR HANDLING
  // ═══════════════════════════════════════════

  /**
   * Convert Mongoose error to AppError
   *
   * @example
   * try {
   *   await Model.create(data);
   * } catch (error) {
   *   if (error instanceof MongooseError) {
   *     throw ErrorFactory.fromMongoose(error);
   *   }
   * }
   */
  static fromMongoose(error: MongooseError | Error): AppError {
    // Mongoose Validation Error
    if (error instanceof MongooseError.ValidationError) {
      const fields = Object.keys(error.errors);

      if (fields.length === 1) {
        const field = fields[0];
        const err = error.errors[field];
        return new AppError('DATABASE_VALIDATION_FAILED', 400, {
          message: `Validation failed for ${field}: ${err.message}`,
          field,
          details: { kind: err.kind, value: err.value },
        });
      }

      const fieldErrors = fields.map((field) => ({
        field,
        message: error.errors[field].message,
        kind: error.errors[field].kind,
      }));

      return new AppError('DATABASE_VALIDATION_FAILED', 400, {
        message: `Validation failed: ${fields.join(', ')}`,
        details: { errors: fieldErrors },
      });
    }

    // Mongoose Cast Error (invalid ObjectId, etc.)
    if (error instanceof MongooseError.CastError) {
      return new AppError('DATABASE_CAST_ERROR', 400, {
        message: `Invalid ${error.kind} for field '${error.path}': ${error.value}`,
        field: error.path,
        details: { kind: error.kind, value: error.value },
      });
    }

    // MongoDB Duplicate Key Error
    if (this.isDuplicateKeyError(error)) {
      const field = this.extractDuplicateKeyField(error);
      return new AppError('DATABASE_DUPLICATE_KEY', 409, {
        message: field ? `Duplicate value for field: ${field}` : 'Duplicate key error',
        field,
        details: { keyPattern: (error as unknown as Record<string, unknown>).keyPattern },
      });
    }

    // MongoDB Timeout Error
    if (this.isTimeoutError(error)) {
      return new AppError('DATABASE_TIMEOUT', 504, {
        message: 'Database operation timed out',
        isOperational: false,
      });
    }

    // Generic Mongoose Error
    return new AppError('DATABASE_ERROR', 500, {
      message: error.message,
      isOperational: false,
    });
  }

  /**
   * Check if error is a MongoDB duplicate key error
   */
  private static isDuplicateKeyError(error: unknown): boolean {
    const err = error as Record<string, unknown>;
    return err.code === 11000 || err.code === 11001;
  }

  /**
   * Extract field name from duplicate key error
   */
  private static extractDuplicateKeyField(error: unknown): string | undefined {
    const err = error as Record<string, unknown>;
    if (err.keyPattern && typeof err.keyPattern === 'object') {
      return Object.keys(err.keyPattern)[0];
    }
    return undefined;
  }

  /**
   * Check if error is a timeout error
   */
  private static isTimeoutError(error: unknown): boolean {
    const err = error as Record<string, unknown>;
    return (
      err.name === 'MongoTimeoutError' ||
      err.name === 'MongoServerSelectionError' ||
      (typeof err.message === 'string' && err.message.includes('timed out'))
    );
  }

  // ═══════════════════════════════════════════
  // FASTIFY ERROR HANDLING
  // ═══════════════════════════════════════════

  /**
   * Convert Fastify validation error to AppError
   */
  static fromFastifyValidation(error: {
    validation?: unknown[];
    validationContext?: string;
    message?: string;
  }): AppError {
    const context = error.validationContext || 'body';
    const message = error.message || 'Validation failed';

    return new AppError('VALIDATION_FAILED', 422, {
      message: `${context} validation failed: ${message}`,
      details: {
        context,
        validation: error.validation,
      },
    });
  }

  // ═══════════════════════════════════════════
  // GENERIC ERROR HANDLING
  // ═══════════════════════════════════════════

  /**
   * Convert any unknown error to AppError
   *
   * @example
   * try {
   *   await someOperation();
   * } catch (error) {
   *   throw ErrorFactory.fromUnknown(error);
   * }
   */
  static fromUnknown(error: unknown): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Zod error
    if (error instanceof ZodError) {
      return this.fromZod(error);
    }

    // Mongoose errors
    if (
      error instanceof MongooseError.ValidationError ||
      error instanceof MongooseError.CastError
    ) {
      return this.fromMongoose(error);
    }

    // MongoDB duplicate key error
    if (this.isDuplicateKeyError(error)) {
      return this.fromMongoose(error as Error);
    }

    // Fastify validation error
    if (
      typeof error === 'object' &&
      error !== null &&
      'validation' in error &&
      Array.isArray((error as Record<string, unknown>).validation)
    ) {
      return this.fromFastifyValidation(error as { validation: unknown[]; message?: string });
    }

    // Standard Error
    if (error instanceof Error) {
      // Check for specific error types by name
      if (error.name === 'MongoServerError' || error.name === 'MongoError') {
        return this.fromMongoose(error);
      }

      return new AppError('UNKNOWN_ERROR', 500, {
        message: error.message,
        stack: error.stack,
        isOperational: false,
      });
    }

    // Non-Error thrown value
    return new AppError('UNKNOWN_ERROR', 500, {
      message: String(error),
      isOperational: false,
    });
  }

  // ═══════════════════════════════════════════
  // CONTEXT-SPECIFIC FACTORIES
  // ═══════════════════════════════════════════

  /**
   * Create error for missing required parameter
   */
  static missingParam(paramName: string): AppError {
    return AppError.fieldRequired(paramName);
  }

  /**
   * Create error for invalid parameter value
   */
  static invalidParam(paramName: string, message?: string): AppError {
    return AppError.fieldInvalid(paramName, message);
  }

  /**
   * Create resource not found error with proper code based on entity type
   */
  static resourceNotFound(
    entityType: 'story' | 'chapter' | 'user' | 'collaborator' | 'notification' | 'comment',
    identifier?: string
  ): AppError {
    const codeMap: Record<string, ErrorCode> = {
      story: 'STORY_NOT_FOUND',
      chapter: 'CHAPTER_NOT_FOUND',
      user: 'USER_NOT_FOUND',
      collaborator: 'COLLABORATOR_NOT_FOUND',
      notification: 'NOTIFICATION_NOT_FOUND',
      comment: 'COMMENT_NOT_FOUND',
    };

    const code = codeMap[entityType] || 'NOT_FOUND';

    return new AppError(code, 404, {
      message: identifier ? `${entityType} not found: ${identifier}` : undefined,
      details: identifier ? { [entityType]: identifier } : undefined,
    });
  }
}
