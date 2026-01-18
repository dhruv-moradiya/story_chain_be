import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '@utils/apiResponse';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '@constants/httpStatus';

// Zod Error Handler
export function handleZodError(error: ZodError): ApiError {
  const errors = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  const message = `Validation failed: ${errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`;

  return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY.code, message, true);
}

// Global Error Handling Middleware
export function globalErrorHandler(isDevelopment: boolean = false) {
  return (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    // Log error for monitoring or centralized logging
    request.log.error(error);

    // ----------------------------------------------------
    // 1. Zod Validation Error
    // ----------------------------------------------------
    if (error instanceof ZodError) {
      const apiError = handleZodError(error);
      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 2. Custom API Error (thrown intentionally)
    // ----------------------------------------------------
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(error.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 3. Fastify Built-in Validation Error (schema validation)
    // ----------------------------------------------------
    if (
      typeof error === 'object' &&
      error !== null &&
      'validation' in error &&
      // eslint-disable-next-line
      Array.isArray((error as any).validation)
    ) {
      // eslint-disable-next-line
      const message = (error as any).message || HTTP_STATUS.UNPROCESSABLE_ENTITY.message;

      const validationError = new ApiError(
        HTTP_STATUS.UNPROCESSABLE_ENTITY.code,
        `Validation failed: ${message}`,
        true
      );

      return reply.code(validationError.statusCode).send(validationError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 4. FastifyError or HttpError with statusCode
    // ----------------------------------------------------
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      // eslint-disable-next-line
      typeof (error as any).statusCode === 'number'
    ) {
      const err = error as FastifyError;

      const status =
        typeof err.statusCode === 'number'
          ? err.statusCode
          : HTTP_STATUS.INTERNAL_SERVER_ERROR.code;

      const apiError = new ApiError(
        status,
        err.message || HTTP_STATUS.INTERNAL_SERVER_ERROR.message,
        status < 500,
        err.stack
      );

      return reply.code(apiError.statusCode).send(apiError.toJSON(isDevelopment));
    }

    // ----------------------------------------------------
    // 5. Unknown or Unexpected Error (Catch-all)
    // ----------------------------------------------------
    const unknownMessage = error instanceof Error ? error.message : String(error);

    const internalError = new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR.code,
      isDevelopment
        ? `Unexpected error: ${unknownMessage}`
        : HTTP_STATUS.INTERNAL_SERVER_ERROR.message,
      false,
      error instanceof Error ? error.stack : undefined
    );

    return reply.code(internalError.statusCode).send(internalError.toJSON(isDevelopment));
  };
}
