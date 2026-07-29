import { FastifyInstance } from 'fastify';
import zodToJsonSchema from 'zod-to-json-schema';
import { container } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { AuthMiddlewareFactory, StoryRoleMiddlewareFactory } from '@/middlewares/factories';
import { StoryRoleGuards } from '@/middlewares/rbac/storyRole.middleware';
import { RateLimits } from '@/constants/rateLimits';
import { CharacterResponses } from '@/schema/response/character.response';
import {
  CharacterCreateSchema,
  CharacterSlugParamsSchema,
} from '@/schema/request/character.schema';
import { CharacterController } from '../controllers/character.controller';

const CharacterApiRoutes = {
  AddCharacter: '/story/:slug',
  GetCharacters: '/story/:slug',
  GenerateSignature: '/story/:slug/signature',
} as const;

export async function characterRoutes(fastify: FastifyInstance) {
  const characterController = container.resolve<CharacterController>(TOKENS.CharacterController);

  const authFactory = container.resolve<AuthMiddlewareFactory>(TOKENS.AuthMiddlewareFactory);
  const storyRoleFactory = container.resolve<StoryRoleMiddlewareFactory>(
    TOKENS.StoryRoleMiddlewareFactory
  );

  const validateAuth = authFactory.createAuthMiddleware();
  const loadStoryContext = storyRoleFactory.createLoadContextBySlug();

  // 1. Add character to story
  fastify.post(
    CharacterApiRoutes.AddCharacter,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Add a new character to a story',
        tags: ['Characters'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(CharacterSlugParamsSchema),
        body: zodToJsonSchema(CharacterCreateSchema),
        response: CharacterResponses.characterAdded,
      },
    },
    characterController.addCharacter
  );

  // 2. Fetch all characters for a story
  fastify.get(
    CharacterApiRoutes.GetCharacters,
    {
      config: { rateLimit: RateLimits.PUBLIC_READ },
      schema: {
        description: 'Get all characters for a story',
        tags: ['Characters'],
        params: zodToJsonSchema(CharacterSlugParamsSchema),
        response: CharacterResponses.characterList,
      },
    },
    characterController.getCharactersByStory
  );

  // 3. Generate signature URL for Cloudinary upload
  fastify.post(
    CharacterApiRoutes.GenerateSignature,
    {
      preHandler: [validateAuth, loadStoryContext, StoryRoleGuards.canEditStorySettings],
      config: { rateLimit: RateLimits.WRITE },
      schema: {
        description: 'Generate signature URL for Cloudinary image upload',
        tags: ['Characters'],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(CharacterSlugParamsSchema),
        response: CharacterResponses.signatureGenerated,
      },
    },
    characterController.generateSignatureURL
  );
}
