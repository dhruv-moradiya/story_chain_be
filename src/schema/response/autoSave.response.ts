import { apiResponse } from './helpers';

// ===============================
// AUTO-SAVE DATA SCHEMAS
// ===============================
export const AutoSaveDraftSchema = {
  type: 'object',
  properties: {
    docs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          chapterSlug: { type: ['string', 'null'] },
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
          storySlug: { type: 'string' },
          parentChapterSlug: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    totalDocs: { type: 'number' },
    limit: { type: 'number' },
    totalPages: { type: 'number' },
    page: { type: 'number' },
    pagingCounter: { type: 'number' },
    hasPrevPage: { type: 'boolean' },
    hasNextPage: { type: 'boolean' },
    prevPage: { type: ['number', 'null'] },
    nextPage: { type: ['number', 'null'] },
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
  saved: { 200: apiResponse(EnableAutoSaveSchema, 'Content saved successfully') },
  disabled: {
    200: apiResponse({ message: { type: 'string' } }, 'Auto-save disabled successfully'),
  },
  draft: { 200: apiResponse(AutoSaveDraftSchema, 'Auto-save draft retrieved') },
  published: {
    201: apiResponse({ type: 'object' }, 'Auto-save draft published successfully'),
  },
};
