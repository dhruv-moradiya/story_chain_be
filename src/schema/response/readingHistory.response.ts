import {
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from './helpers.js';

// ═══════════════════════════════════════════
// READING HISTORY SCHEMAS
// ═══════════════════════════════════════════

export const ReadingHistorySchema = {
  type: 'object',
  properties: {
    totalReadTime: { type: 'number', description: 'Total read time in milliseconds' },
    currentChapterSlug: { type: 'string', description: 'Current chapter being read' },
    lastReadAt: { type: 'string', format: 'date-time', description: 'Last read timestamp' },
    completedPaths: { type: 'number', description: 'Number of completed story paths' },
  },
  required: ['totalReadTime', 'currentChapterSlug', 'lastReadAt', 'completedPaths'],
};

export const ReadingHistorySessionResponseSchema = {
  type: 'object',
  properties: {},
};

// ═══════════════════════════════════════════
// READING HISTORY RESPONSES
// ═══════════════════════════════════════════

export const ReadingHistoryResponses = {
  upsert: {
    201: createdResponse(ReadingHistorySchema, 'Heartbeat recorded successfully'),
    400: badRequestResponse('Invalid heartbeat data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Chapter not found'),
    500: internalErrorResponse(),
  },
  startSession: {
    201: createdResponse(ReadingHistorySessionResponseSchema, 'Session started successfully'),
    400: badRequestResponse('Invalid session data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Story or Chapter not found'),
    500: internalErrorResponse(),
  },
  recordSession: {
    201: createdResponse(ReadingHistorySessionResponseSchema, 'Session recorded successfully'),
    400: badRequestResponse('Invalid session data'),
    401: unauthorizedResponse(),
    500: internalErrorResponse(),
  },
};
