import { apiResponse, apiArrayResponse } from './helpers';

// ===============================
// COLLABORATOR DATA SCHEMAS
// ===============================

export const CollaboratorSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    storyId: { type: 'string' },
    userId: { type: 'string' },
    role: { type: 'string', enum: ['OWNER', 'CO_AUTHOR', 'MODERATOR', 'REVIEWER', 'CONTRIBUTOR'] },
    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'DECLINED'] },
    user: {
      type: 'object',
      properties: {
        clerkId: { type: 'string' },
        username: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
  },
};

// ===============================
// COLLABORATOR RESPONSE OBJECTS
// ===============================

export const CollaboratorResponses = {
  collaboratorList: { 200: apiArrayResponse(CollaboratorSchema, 'List of collaborators') },
  collaboratorCreated: { 201: apiResponse(CollaboratorSchema, 'Invitation created successfully') },
};
