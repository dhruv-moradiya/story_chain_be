import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { catchAsync } from '@/utils/catchAsync';
import { ApiResponse } from '@/utils/apiResponse';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { CharacterService } from '../services/character.service';
import {
  TCharacterCreateSchema,
  TCharacterSignatureSchema,
  TCharacterSlugParamsSchema,
} from '@/schema/request/character.schema';

@singleton()
export class CharacterController extends BaseModule {
  constructor(
    @inject(TOKENS.CharacterService)
    private readonly characterService: CharacterService
  ) {
    super();
  }

  /**
   * Add a new character to a story
   */
  addCharacter = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TCharacterSlugParamsSchema;
        Body: TCharacterCreateSchema;
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;
      const userId = request.user.clerkId;

      const character = await this.characterService.createCharacter(slug, userId, request.body);

      this.logInfo(
        `Character created: "${character.fullName}" (${character._id}) for story ${slug} by ${userId}`
      );

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(
          ApiResponse.created({ id: character._id.toString() }, 'Character added successfully')
        );
    }
  );

  /**
   * Get all characters for a story
   */
  getCharactersByStory = catchAsync(
    async (
      request: FastifyRequest<{ Params: TCharacterSlugParamsSchema }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      const characters = await this.characterService.getCharactersByStorySlug(slug);

      this.logInfo(`Fetched ${characters.length} characters for story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(characters, 'Characters fetched successfully'));
    }
  );

  /**
   * Generate signature URL for Cloudinary image upload
   */
  generateSignatureURL = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TCharacterSlugParamsSchema;
        Body: TCharacterSignatureSchema;
      }>,
      reply: FastifyReply
    ) => {
      const { slug } = request.params;

      const uploadParams = await this.characterService.getUploadSignature(slug);

      this.logInfo(`Generated Cloudinary upload signature for character in story ${slug}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(uploadParams, 'Upload parameters generated successfully'));
    }
  );
}
