import { IGetAllStoryMembersBySlugDTO } from '@/dto/storyCollaborator.dto';
import { IOperationOptions } from '@/types';
import { IStoryCollaboratorDetailsResponse } from '@/types/response/story.response.types';
import { TStoryCollaboratorRole } from '../../types/storyCollaborator.types';

interface ICollaboratorQueryService {
  getCollaboratorsByStorySlug(
    input: IGetAllStoryMembersBySlugDTO,
    options?: IOperationOptions
  ): Promise<IStoryCollaboratorDetailsResponse[]>;

  getCollaboratorRole(
    userId: string,
    storySlug: string,
    options?: IOperationOptions
  ): Promise<TStoryCollaboratorRole | null>;
}

export type { ICollaboratorQueryService };
