import { apiResponse, apiArrayResponse, errorResponse } from './helpers.js';
import { votesSchema, UserSummarySchema } from './common.js';

// ═══════════════════════════════════════════
// CHAPTER DATA SCHEMAS
// ═══════════════════════════════════════════

/**
 * Full chapter stats used across chapter lists and story overview.
 */
export const ChapterStatsSchema = {
  type: 'object',
  properties: {
    reads: { type: 'number' },
    uniqueReaders: { type: 'number' },
    completions: { type: 'number' },
    dropOffs: { type: 'number' },
    totalReadTime: { type: 'number' },
    avgReadTime: { type: 'number' },
    completionRate: { type: 'number' },
    engagementScore: { type: 'number' },
    comments: { type: 'number' },
    childBranches: { type: 'number' },
  },
};

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

/**
 * Schema for chapter with story info (used in user's chapter list).
 */
export const ChapterWithStorySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    storyTitle: { type: 'string' },
    storySlug: { type: 'string' },
    chapterNumber: { type: 'number' },
    status: { type: 'string' },
    isEnding: { type: 'boolean' },
    version: { type: 'number' },
    displayNumber: { type: 'string' },
    votes: votesSchema,
    stats: {
      type: 'object',
      properties: {
        reads: { type: 'number' },
        comments: { type: 'number' },
        childBranches: { type: 'number' },
        uniqueReaders: { type: 'number' },
        completionRate: { type: 'number' },
      },
    },
    reportCount: { type: 'number' },
    isFlagged: { type: 'boolean' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Schema for full chapter details (used for single chapter view).
 */
export const ChapterDetailsSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    status: { type: 'string' },
    parentChapterId: { type: 'string' },
    depth: { type: 'number' },
    chapterNumber: { type: 'number' },
    isEnding: { type: 'boolean' },
    version: { type: 'number' },
    storyId: { type: 'string' },
    storySlug: { type: 'string' },
    storyTitle: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        reads: { type: 'number' },
        comments: { type: 'number' },
        childBranches: { type: 'number' },
      },
    },
    votes: votesSchema,
    author: UserSummarySchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const ChapterSearchResultSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
  },
};

// ═══════════════════════════════════════════
// CHAPTER RESPONSE OBJECTS
// ═══════════════════════════════════════════

export const ChapterResponses = {
  chapterCreated: { 201: apiResponse(ChapterSchema, 'Chapter added successfully') },
  chapterDetails: {
    200: apiResponse(ChapterDetailsSchema, 'Chapter details retrieved successfully'),
    404: errorResponse('Chapter not found'),
  },
  myChapters: {
    200: apiArrayResponse(ChapterWithStorySchema, 'User chapters retrieved successfully'),
  },
  chapterSearch: {
    200: apiArrayResponse(ChapterSearchResultSchema, 'Search results retrieved successfully'),
  },
};
