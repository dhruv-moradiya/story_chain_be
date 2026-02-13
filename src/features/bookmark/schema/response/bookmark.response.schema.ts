import {
  apiResponse,
  badRequestResponse,
  unauthorizedResponse,
  internalErrorResponse,
  notFoundResponse,
} from '@schema/response/helpers';

export const BookmarkSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string' },
    storySlug: { type: 'string' },
    chapterSlug: { type: 'string' },
    note: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const BookmarkToggleResponseSchema = {
  type: 'object',
  properties: {
    isBookmarked: { type: 'boolean' },
  },
};

export const BookmarkResponses = {
  toggle: {
    200: apiResponse(BookmarkToggleResponseSchema, 'Bookmark toggled successfully'),
    400: badRequestResponse('Invalid bookmark data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Story or chapter not found'),
    500: internalErrorResponse(),
  },
};
