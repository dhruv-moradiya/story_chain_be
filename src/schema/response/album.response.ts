import { ALBUM_VISIBILITIES } from '@features/album/types/album-enum.js';
import { GalleryImageSchema } from './galleryImage.response.js';
import {
  apiArrayResponse,
  apiResponse,
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from './helpers.js';

export const AlbumSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    storySlug: { type: 'string' },
    createdBy: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    visibility: { type: 'string', enum: ALBUM_VISIBILITIES },
    sortOrder: { type: 'number' },
    imageCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const AlbumWithImagesSchema = {
  type: 'object',
  properties: {
    ...AlbumSchema.properties,
    images: { type: 'array', items: GalleryImageSchema },
  },
};

export const AlbumResponses = {
  albumCreated: {
    201: apiResponse(AlbumSchema, 'Album created successfully'),
    400: badRequestResponse('Invalid album data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can create albums'),
    404: notFoundResponse('Story not found'),
    422: validationErrorResponse('Validation failed'),
    500: internalErrorResponse(),
  },
  imagesAddedToAlbum: {
    200: apiResponse(AlbumSchema, 'Images added to album successfully'),
    400: badRequestResponse('Invalid image selection'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can add images to album'),
    404: notFoundResponse('Album not found'),
    422: validationErrorResponse('Validation failed'),
    500: internalErrorResponse(),
  },
  albumList: {
    200: apiArrayResponse(AlbumSchema, 'List of albums retrieved successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can view story albums'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  albumDetails: {
    200: apiResponse(AlbumWithImagesSchema, 'Album details retrieved successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can view this album'),
    404: notFoundResponse('Album not found'),
    500: internalErrorResponse(),
  },
  albumUpdated: {
    200: apiResponse(AlbumSchema, 'Album updated successfully'),
    400: badRequestResponse('Invalid update data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can update this album'),
    404: notFoundResponse('Album not found'),
    500: internalErrorResponse(),
  },
  albumDeleted: {
    200: apiResponse({ type: 'object' }, 'Album deleted successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('Only story collaborators can delete this album'),
    404: notFoundResponse('Album not found'),
    500: internalErrorResponse(),
  },
};
