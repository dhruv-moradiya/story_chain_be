import {
  STORY_COLLABORATOR_ROLES,
  STORY_COLLABORATOR_STATUSES,
} from '@/features/storyCollaborator/types/storyCollaborator-enum';
import { apiResponse, apiArrayResponse } from './helpers';

// ===============================
// COLLABORATOR DATA SCHEMAS
// ===============================

export const CollaboratorSchema = {
  type: 'object',
  properties: {
    storyId: { type: 'string' },
    userId: { type: 'string' },
    role: { type: 'string', enum: STORY_COLLABORATOR_ROLES },
    status: { type: 'string', enum: STORY_COLLABORATOR_STATUSES },
    user: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
    invitedBy: {
      type: ['object', 'null'],
      properties: {
        clerkId: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
    invitedAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// ===============================
// COLLABORATOR RESPONSE OBJECTS
// ===============================

export const CollaboratorResponses = {
  collaboratorList: { 200: apiArrayResponse(CollaboratorSchema, 'List of collaborators') },
  collaboratorCreated: { 201: apiResponse(CollaboratorSchema, 'Invitation created successfully') },
};
