import {
  STORY_COLLABORATOR_ROLES,
  STORY_COLLABORATOR_STATUSES,
} from '@/features/storyCollaborator/types/storyCollaborator-enum.js';
import { apiResponse, apiArrayResponse } from './helpers.js';
import { UserSummarySchema } from './common.js';

// ═══════════════════════════════════════════
// COLLABORATOR DATA SCHEMAS
// ═══════════════════════════════════════════

/**
 * Full collaborator record with user details and invitedBy.
 * Used by the collaborator list / invite endpoints.
 */
export const CollaboratorSchema = {
  type: 'object',
  properties: {
    storyId: { type: 'string' },
    userId: { type: 'string' },
    role: { type: 'string', enum: STORY_COLLABORATOR_ROLES },
    status: { type: 'string', enum: STORY_COLLABORATOR_STATUSES },
    user: UserSummarySchema,
    invitedBy: {
      type: ['object', 'null'],
      properties: UserSummarySchema.properties,
    },
    invitedAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Lightweight collaborator entry embedded inside a story overview.
 * Contains role, status and nested user details.
 */
export const EmbeddedCollaboratorSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    role: { type: 'string', enum: Object.values(STORY_COLLABORATOR_ROLES) },
    status: { type: 'string', enum: Object.values(STORY_COLLABORATOR_STATUSES) },
    details: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        ...UserSummarySchema.properties,
      },
    },
  },
};

// ═══════════════════════════════════════════
// COLLABORATOR RESPONSE OBJECTS
// ═══════════════════════════════════════════

export const CollaboratorResponses = {
  collaboratorList: { 200: apiArrayResponse(CollaboratorSchema, 'List of collaborators') },
  collaboratorCreated: { 201: apiResponse(CollaboratorSchema, 'Invitation created successfully') },
};
