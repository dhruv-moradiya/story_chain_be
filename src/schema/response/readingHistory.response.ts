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

export const ReadingHistoryResponseSchema = {
  type: 'object',
  properties: {
    totalReadTime: { type: 'number', description: 'Total read time in milliseconds' },
    currentChapterSlug: { type: 'string', description: 'Current chapter being read' },
    lastReadAt: { type: 'string', format: 'date-time', description: 'Last read timestamp' },
    completedPaths: { type: 'number', description: 'Number of completed story paths' },
  },
  required: ['totalReadTime', 'currentChapterSlug', 'lastReadAt', 'completedPaths'],
};

// ═══════════════════════════════════════════
// READING HISTORY RESPONSES
// ═══════════════════════════════════════════

export const ReadingHistoryResponses = {
  recordHeartBeat: {
    201: createdResponse(ReadingHistoryResponseSchema, 'Heartbeat recorded successfully'),
    400: badRequestResponse('Invalid heartbeat data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Chapter not found'),
    500: internalErrorResponse(),
  },
};
