import {
  apiResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from './helpers.js';

// ═══════════════════════════════════════════
// ANALYTICS SCHEMAS
// ═══════════════════════════════════════════

export const AnalyticsDataSchema = {
  type: 'object',
  properties: {
    labels: {
      type: 'array',
      items: { type: 'string' },
      description: 'Human-readable bucket labels (e.g. "00:00" for hourly, "2025-05-01" for daily)',
    },
    reads: {
      type: 'array',
      items: { type: 'number' },
      description: 'Total qualified reads per bucket',
    },
    uniqueReaders: {
      type: 'array',
      items: { type: 'number' },
      description: 'Distinct reader count per bucket',
    },
    totalReadTime: {
      type: 'array',
      items: { type: 'number' },
      description: 'Sum of read time (seconds) per bucket',
    },
    type: { type: 'string', description: 'Analytics type used' },
    from: { type: 'string', format: 'date-time', description: 'Start of date range' },
    to: { type: 'string', format: 'date-time', description: 'End of date range' },
  },
  required: ['labels', 'reads', 'uniqueReaders', 'totalReadTime', 'type', 'from', 'to'],
};

// ═══════════════════════════════════════════
// ANALYTICS RESPONSES
// ═══════════════════════════════════════════

export const AnalyticsResponses = {
  chapterAnalytics: {
    200: apiResponse(AnalyticsDataSchema, 'Chapter analytics fetched successfully'),
    400: badRequestResponse('Invalid analytics query parameters'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have permission to view analytics for this story'),
    404: notFoundResponse('Story or chapter not found'),
    500: internalErrorResponse(),
  },
  storyAnalytics: {
    200: apiResponse(AnalyticsDataSchema, 'Story analytics fetched successfully'),
    400: badRequestResponse('Invalid analytics query parameters'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have permission to view analytics for this story'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
};
