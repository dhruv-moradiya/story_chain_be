import { apiResponse } from './helpers';

export const ReadingHistorySchema = {
  type: 'object',
  properties: {
    totalReadTime: { type: 'number' },
    currentChapterSlug: { type: 'string' },
    lastReadAt: { type: 'string', format: 'date-time' },
  },
};

export const ReadingHistoryResponses = {
  recordHeartBeat: {
    201: apiResponse(ReadingHistorySchema, 'Heartbeat recorded successfully'),
  },
};
