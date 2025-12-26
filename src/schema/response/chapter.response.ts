import { apiResponse, errorResponse } from './helpers';

// ===============================
// CHAPTER DATA SCHEMAS
// ===============================

export const ChapterSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    storyId: { type: 'string' },
    parentChapterId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// ===============================
// CHAPTER RESPONSE OBJECTS
// ===============================

export const ChapterResponses = {
  chapterCreated: { 201: apiResponse(ChapterSchema, 'Chapter added successfully') },
  chapterDetails: {
    200: apiResponse(ChapterSchema, 'Chapter details'),
    404: errorResponse('Chapter not found'),
  },
};
