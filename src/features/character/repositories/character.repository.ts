import { PipelineStage } from 'mongoose';
import { singleton } from 'tsyringe';
import { BaseRepository } from '@/utils/baseClass';
import { Character } from '@/models/character.model';
import { ICharacter, ICharacterDoc } from '../types/character.types';

@singleton()
export class CharacterRepository extends BaseRepository<ICharacter, ICharacterDoc> {
  constructor() {
    super(Character);
  }

  async findByStorySlug(storySlug: string): Promise<ICharacter[]> {
    return this.findMany({
      filter: { storySlug },
      options: { sort: { createdAt: -1 } },
    });
  }

  async createCharacter(characterData: Partial<ICharacterDoc>): Promise<ICharacterDoc> {
    const doc = new this.model(characterData);
    const saved = await doc.save();
    return saved as ICharacterDoc;
  }

  async aggregateCharacters<T = ICharacter>(pipeline: PipelineStage[]): Promise<T[]> {
    return this.model.aggregate<T>(pipeline).exec();
  }
}
