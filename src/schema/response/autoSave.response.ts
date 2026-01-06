import { apiResponse } from './helpers';

// ===============================
// AUTO-SAVE DATA SCHEMAS
// ===============================
export const AutoSaveDraftSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      chapterId: { type: ['string', 'null'] },
      userId: { type: 'string' },
      content: { type: 'string' },
      title: { type: ['string', 'null'] },
      lastSavedAt: { type: 'string', format: 'date-time' },
      isEnabled: { type: 'boolean' },
      saveCount: { type: 'number' },
      changes: {
        type: ['object', 'null'],
        properties: {
          additionsCount: { type: 'number' },
          deletionsCount: { type: 'number' },
        },
      },
      autoSaveType: { type: 'string' },
      storyId: { type: 'string' },
      parentChapterId: { type: ['string', 'null'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
};

export const EnableAutoSaveSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    saveCount: { type: 'number' },
  },
};

// ===============================
// AUTO-SAVE RESPONSE OBJECTS
// ===============================

export const AutoSaveResponses = {
  enabled: { 200: apiResponse(EnableAutoSaveSchema, 'Auto-save enabled successfully') },
  saved: { 200: apiResponse({ message: { type: 'string' } }, 'Content saved successfully') },
  disabled: {
    200: apiResponse({ message: { type: 'string' } }, 'Auto-save disabled successfully'),
  },
  draft: { 200: apiResponse(AutoSaveDraftSchema, 'Auto-save draft retrieved') },
  published: {
    201: apiResponse({ type: 'object' }, 'Auto-save draft published successfully'),
  },
};
