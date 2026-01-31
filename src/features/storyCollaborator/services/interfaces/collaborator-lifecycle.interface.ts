import { IStoryCollaboratorCreateDTO } from '@/dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';
import { IStoryCollaborator } from '../../types/storyCollaborator.types';

interface ICollaboratorLifecycleService {
  createCollaborator(
    input: IStoryCollaboratorCreateDTO,
    options?: IOperationOptions
  ): Promise<IStoryCollaborator>;

  removeCollaborator(storySlug: string, userId: string): Promise<void>;
}

export type { ICollaboratorLifecycleService };
