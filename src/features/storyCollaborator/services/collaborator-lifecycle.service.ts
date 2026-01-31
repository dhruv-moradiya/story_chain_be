import { BaseModule } from '@/utils/baseClass';
import { inject, singleton } from 'tsyringe';
import { ICollaboratorLifecycleService } from './interfaces';
import { TOKENS } from '@/container';
import { IStoryCollaboratorCreateDTO } from '@/dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';
import { IStoryCollaborator } from '../types/storyCollaborator.types';
import { StoryCollaboratorRepository } from '../repositories/storyCollaborator.repository';
import { StoryRepository } from '@features/story/repositories/story.repository';

@singleton()
class CollaboratorLifecycleService extends BaseModule implements ICollaboratorLifecycleService {
  constructor(
    @inject(TOKENS.StoryCollaboratorRepository)
    private readonly storyCollaboratorRepo: StoryCollaboratorRepository,
    @inject(TOKENS.StoryRepository)
    private readonly storyRepo: StoryRepository
  ) {
    super();
  }

  async createCollaborator(
    input: IStoryCollaboratorCreateDTO,
    options: IOperationOptions = {}
  ): Promise<IStoryCollaborator> {
    const { userId, role, slug, status } = input;

    // Verify story exists
    const story = await this.storyRepo.findBySlug(slug, options);
    if (!story) {
      this.throwNotFoundError(`Story not found for slug: ${slug}`);
    }

    const collaborator = await this.storyCollaboratorRepo.create(
      {
        slug,
        role,
        userId,
        ...(status ? { status } : {}),
      },
      options
    );

    if (!collaborator) {
      this.throwInternalError('Collaborator could not be created due to an unexpected error.');
    }

    return collaborator;
  }

  async removeCollaborator(_storySlug: string, _userId: string): Promise<void> {
    // TODO: Implement collaborator removal logic
    this.throwInternalError('removeCollaborator not yet implemented');
  }
}

export { CollaboratorLifecycleService };
