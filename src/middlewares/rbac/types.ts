import { PlatformRole, TPlatformPermission } from '@features/platformRole/types/platformRole.types';
import { TStoryCollaboratorPermission } from '@features/storyCollaborator/types/storyCollaborator.types';
import { ID } from '@/types';
import { StoryCollaboratorRole } from '@/features/storyCollaborator/types/storyCollaborator-enum';

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
