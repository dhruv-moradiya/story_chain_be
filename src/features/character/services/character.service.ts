import { inject, singleton } from 'tsyringe';
import { PipelineStage } from 'mongoose';
import { TOKENS } from '@/container/tokens';
import { BaseModule } from '@/utils/baseClass';
import { env } from '@/config/env';
import { getCharacterUploadSignature } from '@/utils/cloudinary';
import { CharacterRepository } from '../repositories/character.repository';
import { StoryRepository } from '@/features/story/repositories/story.repository';
import { CharacterPipelineBuilder } from '../pipelines/characterPipeline.builder';
import { ICharacter, ICharacterDoc } from '../types/character.types';
import { TCharacterCreateSchema } from '@/schema/request/character.schema';

export interface ICharacterSignatureResponse {
  uploadURL: string;
}

@singleton()
export class CharacterService extends BaseModule {
  constructor(
    @inject(TOKENS.CharacterRepository)
    private readonly characterRepo: CharacterRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository
  ) {
    super();
  }

  /**
   * Create a new character for a story
   */
  async createCharacter(
    storySlug: string,
    createdBy: string,
    data: TCharacterCreateSchema
  ): Promise<ICharacterDoc> {
    const story = await this.storyRepo.findBySlug(storySlug);
    if (!story) {
      this.throwNotFoundError('STORY_NOT_FOUND', `Story with slug "${storySlug}" was not found.`);
    }

    const newCharacter = await this.characterRepo.createCharacter({
      ...data,
      storySlug,
      createdBy,
    } as Partial<ICharacterDoc>);

    return newCharacter;
  }

  /**
   * Fetch all characters for a specific story
   */
  async getCharactersByStorySlug(storySlug: string): Promise<ICharacter[]> {
    const story = await this.storyRepo.findBySlug(storySlug);
    if (!story) {
      this.throwNotFoundError('STORY_NOT_FOUND', `Story with slug "${storySlug}" was not found.`);
    }

    const pipeline = new CharacterPipelineBuilder()
      .byStorySlug(storySlug)
      .sortByField('createdAt', -1)
      .build();

    const characters = await this.characterRepo.aggregateCharacters<ICharacter>(
      pipeline as PipelineStage[]
    );
    return characters;
  }

  /**
   * Generate signature URL for direct Cloudinary upload of character image
   */
  async getUploadSignature(storySlug: string): Promise<ICharacterSignatureResponse> {
    const story = await this.storyRepo.findBySlug(storySlug);
    if (!story) {
      this.throwNotFoundError('STORY_NOT_FOUND', `Story with slug "${storySlug}" was not found.`);
    }

    const signatureQuery = getCharacterUploadSignature(storySlug);
    const uploadURL = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload${signatureQuery}`;

    return {
      uploadURL,
    };
  }
}
