import { GALLERY_CATEGORIES } from '@features/galleryImage/types/galleryImage-enum.js';
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

export const GalleryImageSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    storySlug: { type: 'string' },
    uploadedBy: { type: 'string' },
    url: { type: 'string' },
    publicId: { type: 'string' },
    title: { type: 'string' },
    caption: { type: 'string' },
    category: { type: 'string', enum: GALLERY_CATEGORIES },
    tags: { type: 'array', items: { type: 'string' } },
    chapterSlug: { type: 'string' },
    isMoodboard: { type: 'boolean' },
    sortOrder: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const GalleryImageResponses = {
  imagesUploaded: {
    201: apiArrayResponse(GalleryImageSchema, 'Images uploaded successfully'),
    400: badRequestResponse('Invalid image data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to upload images to this story'),
    404: notFoundResponse('Story not found'),
    422: validationErrorResponse('Validation failed'),
    500: internalErrorResponse(),
  },
  imageList: {
    200: apiArrayResponse(GalleryImageSchema, 'List of gallery images retrieved successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to view this story gallery'),
    404: notFoundResponse('Story not found'),
    500: internalErrorResponse(),
  },
  imageUpdated: {
    200: apiResponse(GalleryImageSchema, 'Gallery image updated successfully'),
    400: badRequestResponse('Invalid update data'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to update this image'),
    404: notFoundResponse('Image not found'),
    500: internalErrorResponse(),
  },
  imageDeleted: {
    200: apiResponse({ type: 'object' }, 'Gallery image deleted successfully'),
    401: unauthorizedResponse(),
    403: forbiddenResponse('You do not have access to delete this image'),
    404: notFoundResponse('Image not found'),
    500: internalErrorResponse(),
  },
};
