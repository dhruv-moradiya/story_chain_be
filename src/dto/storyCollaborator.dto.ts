import { ID } from '../types';
import {
  TStoryCollaboratorRole,
  TStoryCollaboratorStatus,
} from '../features/storyCollaborator/storyCollaborator.types';

interface IStoryCollaboratorCreateDTO {
  storyId: ID;
  userId: string;
  role: TStoryCollaboratorRole;
  status?: TStoryCollaboratorStatus;
}

interface IStoryCollaboratorInvitationDTO {
  storyId: ID;
  role: TStoryCollaboratorRole;
  invitedUser: {
    id: string;
    name: string;
  };
  inviterUser: {
    id: string;
    name: string;
  };
}

interface IStoryCollaboratorUpdateStatusDTO {
  status: TStoryCollaboratorStatus;
  userId: string;
  stotyId: ID;
}

interface IGetAllStoryMembers {
  storyId: ID;
}

export type {
  IStoryCollaboratorInvitationDTO,
  IGetAllStoryMembers,
  IStoryCollaboratorCreateDTO,
  IStoryCollaboratorUpdateStatusDTO,
};
