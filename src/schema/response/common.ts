// ═══════════════════════════════════════════════════════════════════════════════
// COMMON RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════
// This file contains reusable schema components for API responses.
// All schemas are compatible with Fastify's JSON Schema validation.
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// SUCCESS CODES (for 2xx responses)
// ═══════════════════════════════════════════
export const SUCCESS_CODES = [
  'SUCCESS',
  'CREATED',
  'UPDATED',
  'DELETED',
  'FETCHED',
  'NO_CONTENT',
  'ACCEPTED',
] as const;

export type SuccessCode = (typeof SUCCESS_CODES)[number];

export const successCodeSchema = {
  type: 'string',
  enum: SUCCESS_CODES,
};

// ═══════════════════════════════════════════
// ERROR CODES (for 4xx/5xx responses)
// ═══════════════════════════════════════════
// Note: We use 'string' type for flexibility since error codes are extensive
// The actual validation happens in TypeScript via ErrorCode type
export const errorCodeSchema = {
  type: 'string',
  description:
    'Error code for i18n support. See src/infrastructure/errors/error-codes.ts for full list.',
};

// ═══════════════════════════════════════════
// PAGINATION SCHEMA
// ═══════════════════════════════════════════
export const paginationMetaSchema = {
  type: 'object',
  properties: {
    page: { type: 'number', description: 'Current page number (1-indexed)' },
    limit: { type: 'number', description: 'Number of items per page' },
    total: { type: 'number', description: 'Total number of items' },
    totalPages: { type: 'number', description: 'Total number of pages' },
    hasNext: { type: 'boolean', description: 'Whether there is a next page' },
    hasPrev: { type: 'boolean', description: 'Whether there is a previous page' },
  },
  additionalProperties: false,
};

export const paginationRequestSchema = {
  type: 'object',
  properties: {
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number (1-indexed)',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 10,
      description: 'Number of items per page',
    },
    sortBy: {
      type: 'string',
      description: 'Field to sort by',
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
      description: 'Sort order',
    },
  },
};

// ═══════════════════════════════════════════
// COMMON DATA SCHEMAS
// ═══════════════════════════════════════════
export const objectIdSchema = {
  type: 'string',
  pattern: '^[a-fA-F0-9]{24}$',
  description: 'MongoDB ObjectId',
};

export const dateSchema = {
  type: 'string',
  format: 'date-time',
  description: 'ISO 8601 date-time string',
};

export const slugSchema = {
  type: 'string',
  pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  description: 'URL-friendly slug',
};

export const clerkIdSchema = {
  type: 'string',
  description: 'Clerk user ID',
};

// ═══════════════════════════════════════════
// AUTHOR/USER SUMMARY SCHEMA
// ═══════════════════════════════════════════
export const authorSummarySchema = {
  type: 'object',
  properties: {
    clerkId: clerkIdSchema,
    username: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
  },
};

// ═══════════════════════════════════════════
// TIMESTAMPS SCHEMA
// ═══════════════════════════════════════════
export const timestampsSchema = {
  createdAt: dateSchema,
  updatedAt: dateSchema,
};

// ═══════════════════════════════════════════
// VOTES/STATS SCHEMA
// ═══════════════════════════════════════════
export const votesSchema = {
  type: 'object',
  properties: {
    upvotes: { type: 'number' },
    downvotes: { type: 'number' },
    score: { type: 'number' },
  },
};

export const statsSchema = {
  type: 'object',
  properties: {
    reads: { type: 'number' },
    comments: { type: 'number' },
    childBranches: { type: 'number' },
  },
};
