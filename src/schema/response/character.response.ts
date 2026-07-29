import { apiArrayResponse, apiResponse, createdResponse } from './helpers.js';

export const CharacterSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    storySlug: { type: 'string' },
    createdBy: { type: 'string' },
    fullName: { type: 'string' },
    nickname: { type: 'string' },
    roleInStory: { type: 'string' },
    age: { type: 'number' },
    gender: { type: 'string' },
    nationality: { type: 'string' },
    occupation: { type: 'string' },
    statusInStory: { type: 'string' },
    image: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        publicId: { type: 'string' },
      },
      nullable: true,
    },
    biography: { type: 'string' },
    personality: { type: 'string' },
    motivationGoal: { type: 'string' },
    languages: { type: 'array', items: { type: 'string' } },
    birthplace: { type: 'string' },
    family: { type: 'string' },
    education: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    greatestFear: { type: 'string' },
    habitsQuirks: { type: 'string' },
    secrets: { type: 'string' },
    appearance: { type: 'object' },
    attributes: { type: 'object' },
    quote: { type: 'string' },
    quickFacts: { type: 'array', items: { type: 'string' } },
    firstAppearsChapterSlug: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    relationships: { type: 'array', items: { type: 'object' } },
    appearances: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const CharacterAddedSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
};

export const CharacterSignatureResponseSchema = {
  type: 'object',
  properties: {
    uploadURL: { type: 'string' },
  },
};

export const CharacterResponses = {
  characterAdded: {
    201: createdResponse(CharacterAddedSchema, 'Character added successfully'),
  },
  characterList: {
    200: apiArrayResponse(CharacterSchema, 'List of characters retrieved successfully'),
  },
  signatureGenerated: {
    200: apiResponse(CharacterSignatureResponseSchema, 'Signature URL generated successfully'),
  },
};
