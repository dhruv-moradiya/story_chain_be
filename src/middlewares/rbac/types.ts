import { PlatformRole, TPlatformPermission } from '../../features/platformRole/platformRole.types';
import {
  StoryCollaboratorRole,
  TStoryCollaboratorPermission,
} from '../../features/storyCollaborator/storyCollaborator.types';
import { ID } from '../../types';

export interface IPermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: PlatformRole | StoryCollaboratorRole;
  requiredPermission?: TPlatformPermission | TStoryCollaboratorPermission;
}

// Story context for role checking
export interface StoryContext {
  storyId: ID;
  creatorId: string;
  status: string;
  collaborators?: Array<{
    userId: string;
    role: StoryCollaboratorRole;
  }>;
}
