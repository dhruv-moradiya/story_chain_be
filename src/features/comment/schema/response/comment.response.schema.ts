import {
  apiArrayResponse,
  apiResponse,
  badRequestResponse,
  createdResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@schema/response/helpers';

export const CommentSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    chapterSlug: { type: 'string' },
    userId: { type: 'string' },
    parentCommentId: { type: 'string', nullable: true },
    content: { type: 'string' },
    votes: {
      type: 'object',
      properties: {
        upvotes: { type: 'number' },
        downvotes: { type: 'number' },
      },
    },
    isEdited: { type: 'boolean' },
    editedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
    deletedAt: { type: 'string', format: 'date-time' },
    reportCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const CommentListResponseSchema = {
  type: 'array',
  items: CommentSchema,
};

export const CommentResponses = {
  commentCreated: {
    201: createdResponse({ type: 'null' }, 'Comment added successfully'),
    400: badRequestResponse('Invalid comment data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Chapter not found'),
    500: internalErrorResponse(),
  },
  commentUpdated: {
    200: apiResponse({ type: 'null' }, 'Comment updated successfully'),
    400: badRequestResponse('Invalid comment data'),
    401: unauthorizedResponse(),
    404: notFoundResponse('Comment not found'),
    500: internalErrorResponse(),
  },
  commentDeleted: {
    200: apiResponse(CommentSchema, 'Comment deleted successfully'), // Or { success: true }
    401: unauthorizedResponse(),
    404: notFoundResponse('Comment not found'),
    500: internalErrorResponse(),
  },
  commentDetails: {
    200: apiResponse(CommentSchema, 'Comment retrieved successfully'),
    404: notFoundResponse('Comment not found'),
    500: internalErrorResponse(),
  },
  commentList: {
    200: apiArrayResponse(CommentSchema, 'Comments retrieved successfully'),
    404: notFoundResponse('Chapter not found'),
    500: internalErrorResponse(),
  },
};
