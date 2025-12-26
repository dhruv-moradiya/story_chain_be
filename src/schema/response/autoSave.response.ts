import { apiResponse } from './helpers';

// ===============================
// AUTO-SAVE DATA SCHEMAS
// ===============================

export const AutoSaveDraftSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    chapterId: { type: 'string' },
    userId: { type: 'string' },
    content: { type: 'string' },
    savedAt: { type: 'string', format: 'date-time' },
  },
};

// ===============================
// AUTO-SAVE RESPONSE OBJECTS
// ===============================

export const AutoSaveResponses = {
  enabled: { 200: apiResponse({ message: { type: 'string' } }, 'Auto-save enabled successfully') },
  saved: { 200: apiResponse({ message: { type: 'string' } }, 'Content saved successfully') },
  disabled: {
    200: apiResponse({ message: { type: 'string' } }, 'Auto-save disabled successfully'),
  },
  draft: { 200: apiResponse(AutoSaveDraftSchema, 'Auto-save draft retrieved') },
};
