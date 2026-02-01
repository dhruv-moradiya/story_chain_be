import {
  IStoryCollaboratorInvitationDTO,
  IStoryCollaboratorUpdateStatusDTO,
} from '@/dto/storyCollaborator.dto';
import { IStoryCollaborator } from '../../types/storyCollaborator.types';
import { IOperationOptions } from '@/types';

interface ICollaboratorInvitationService {
  createInvite(input: IStoryCollaboratorInvitationDTO): Promise<IStoryCollaborator>;
  updateCollaboratorStatus(
    input: IStoryCollaboratorUpdateStatusDTO,
    options?: IOperationOptions
  ): Promise<IStoryCollaborator>;
}

export type { ICollaboratorInvitationService };
