// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
// This file provides helper functions to generate Fastify-compatible JSON schemas
// for API responses that match the ApiResponse class structure.
// ═══════════════════════════════════════════════════════════════════════════════

import { successCodeSchema, errorCodeSchema, paginationMetaSchema } from './common.js';

// ═══════════════════════════════════════════
// BASE RESPONSE STRUCTURES
// ═══════════════════════════════════════════

/**
 * Base success response structure
 * Matches: ApiResponse class
 */
const baseSuccessResponse = {
  success: { type: 'boolean', const: true },
  code: successCodeSchema,
  message: { type: 'string' },
};

/**
 * Base error response structure
 * Matches: ApiError class
 */
const baseErrorResponse = {
  success: { type: 'boolean', const: false },
  code: errorCodeSchema,
  message: { type: 'string' },
  statusCode: { type: 'number' },
  data: { type: 'null' },
};

// ═══════════════════════════════════════════
// SUCCESS RESPONSE HELPERS (2xx)
// ═══════════════════════════════════════════

/**
 * Standard success response with data
 * @example apiResponse(userSchema, 'User retrieved successfully')
 */
export const apiResponse = (dataSchema: object, description: string) => ({
  description,
  type: 'object',
  properties: {
    ...baseSuccessResponse,
    data: dataSchema,
  },
  required: ['success', 'code', 'message', 'data'],
});

/**
 * Success response with array data
 * @example apiArrayResponse(userItemSchema, 'Users retrieved successfully')
 */
export const apiArrayResponse = (itemSchema: object, description: string) => ({
  description,
  type: 'object',
  properties: {
    ...baseSuccessResponse,
    data: {
      type: 'array',
      items: itemSchema,
    },
  },
  required: ['success', 'code', 'message', 'data'],
});

/**
 * Success response with paginated data
 * @example apiPaginatedResponse(storyItemSchema, 'Stories retrieved successfully')
 */
export const apiPaginatedResponse = (itemSchema: object, description: string) => ({
  description,
  type: 'object',
  properties: {
    ...baseSuccessResponse,
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: itemSchema,
        },
        pagination: paginationMetaSchema,
      },
      required: ['items', 'pagination'],
    },
  },
  required: ['success', 'code', 'message', 'data'],
});

/**
 * 201 Created response
 * @example createdResponse(storySchema, 'Story created successfully')
 */
export const createdResponse = (dataSchema: object, description: string = 'Resource created') => ({
  description,
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    code: { type: 'string', const: 'CREATED' },
    message: { type: 'string' },
    data: dataSchema,
  },
  required: ['success', 'code', 'message', 'data'],
});

/**
 * 204 No Content response (for deletes)
 */
export const noContentResponse = (description: string = 'Operation completed successfully') => ({
  description,
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    code: { type: 'string', const: 'DELETED' },
    message: { type: 'string' },
    data: { type: 'null' },
  },
  required: ['success', 'code', 'message'],
});

// ═══════════════════════════════════════════
// ERROR RESPONSE HELPERS (4xx/5xx)
// ═══════════════════════════════════════════

/**
 * Generic error response
 * Used for all error status codes
 */
export const errorResponse = (description: string) => ({
  description,
  type: 'object',
  properties: {
    ...baseErrorResponse,
    field: { type: 'string', description: 'Field that caused the error (for validation errors)' },
    details: {
      type: 'object',
      additionalProperties: true,
      description: 'Additional error details',
    },
    ...(process.env.NODE_ENV === 'development' && { stack: { type: 'string' } }),
  },
  required: ['success', 'code', 'message', 'statusCode', 'data'],
});

/**
 * 400 Bad Request
 */
export const badRequestResponse = (
  description: string = 'Bad request - Invalid input or parameters'
) => errorResponse(description);

/**
 * 401 Unauthorized
 */
export const unauthorizedResponse = (
  description: string = 'Unauthorized - Authentication required'
) => errorResponse(description);

/**
 * 403 Forbidden
 */
export const forbiddenResponse = (description: string = 'Forbidden - Insufficient permissions') =>
  errorResponse(description);

/**
 * 404 Not Found
 */
export const notFoundResponse = (description: string = 'Not Found - Resource does not exist') =>
  errorResponse(description);

/**
 * 409 Conflict
 */
export const conflictResponse = (description: string = 'Conflict - Resource already exists') =>
  errorResponse(description);

/**
 * 422 Unprocessable Entity (Validation Error)
 */
export const validationErrorResponse = (description: string = 'Validation Error') => ({
  ...errorResponse(description),
  properties: {
    ...errorResponse(description).properties,
    details: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
  },
});

/**
 * 429 Too Many Requests
 */
export const rateLimitResponse = (
  description: string = 'Too Many Requests - Rate limit exceeded'
) => errorResponse(description);

/**
 * 500 Internal Server Error
 */
export const internalErrorResponse = (description: string = 'Internal Server Error') =>
  errorResponse(description);

/**
 * 502 Bad Gateway
 */
export const badGatewayResponse = (description: string = 'Bad Gateway - External service error') =>
  errorResponse(description);

/**
 * 503 Service Unavailable
 */
export const serviceUnavailableResponse = (description: string = 'Service Unavailable') =>
  errorResponse(description);

// ═══════════════════════════════════════════
// COMBINED RESPONSE SCHEMAS
// ═══════════════════════════════════════════

/**
 * Standard responses object for route schemas
 * Use this for common endpoints
 */
export const standardResponses = (successSchema: object, successDescription: string) => ({
  200: apiResponse(successSchema, successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  500: internalErrorResponse(),
});

/**
 * Standard responses for GET endpoints
 */
export const getResponses = (successSchema: object, successDescription: string) => ({
  200: apiResponse(successSchema, successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  404: notFoundResponse(),
  500: internalErrorResponse(),
});

/**
 * Standard responses for POST (create) endpoints
 */
export const createResponses = (successSchema: object, successDescription: string) => ({
  201: createdResponse(successSchema, successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  409: conflictResponse(),
  422: validationErrorResponse(),
  500: internalErrorResponse(),
});

/**
 * Standard responses for PUT/PATCH (update) endpoints
 */
export const updateResponses = (successSchema: object, successDescription: string) => ({
  200: apiResponse(successSchema, successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  404: notFoundResponse(),
  409: conflictResponse(),
  422: validationErrorResponse(),
  500: internalErrorResponse(),
});

/**
 * Standard responses for DELETE endpoints
 */
export const deleteResponses = (successDescription: string = 'Resource deleted successfully') => ({
  200: noContentResponse(successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  404: notFoundResponse(),
  500: internalErrorResponse(),
});

/**
 * Standard responses for list endpoints with pagination
 */
export const listResponses = (itemSchema: object, successDescription: string) => ({
  200: apiPaginatedResponse(itemSchema, successDescription),
  400: badRequestResponse(),
  401: unauthorizedResponse(),
  403: forbiddenResponse(),
  500: internalErrorResponse(),
});
