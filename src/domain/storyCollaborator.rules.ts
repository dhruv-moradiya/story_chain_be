import { STORY_ROLES } from '@constants/index';
import { IStory } from '@features/story/types/story.types';
import {
  ROLE_HIERARCHY,
  TStoryCollaboratorPermission,
  TStoryCollaboratorRole,
} from '@features/storyCollaborator/types/storyCollaborator.types';

export class StoryCollaboratorRules {
  /**
   * Checks if the given user is the creator of the story.
   * Only the story creator is allowed to generate invitation links.
   *
   * @param story - The story object being checked.
   * @param inviterUserId - The ID of the user attempting to create the invitation.
   * @returns True if the user is the story creator, otherwise false.
   */
  static canUserHaveAccessToCreateInvitation(story: IStory, inviterUserId: string): boolean {
    return story.creatorId === inviterUserId;
  }

  /**
   * Determines whether the inviter is already a collaborator of the story.
   * Useful for validating actions that require existing collaborator status.
   *
   * @param invitorUserId - The ID of the inviter user.
   * @param collaborators - List of all collaborators of the story.
   * @returns True if the inviter exists in the collaborator list, otherwise false.
   */
  static isInvitorIsCollaboratorOfStory(invitorUserId: string, collaboratorIds: string[]): boolean {
    return collaboratorIds.some((collaboratorId) => collaboratorId === invitorUserId);
  }

  /**
   * Ensures that the inviter's role provides permission to send collaborator invitations.
   * Roles define permission flags, and this checks the `canInviteCollaborators` ability.
   *
   * @param role - The role of the inviter.
   * @returns True if the role allows sending invitations, otherwise false.
   */
  static ensureInviterHasSufficientRole(role: TStoryCollaboratorRole): boolean {
    return STORY_ROLES[role].permissions.canInviteCollaborators;
  }

  /**
   * Validates the role hierarchy to prevent role escalation.
   * A user can only invite collaborators with roles equal to or lower than their own.
   *
   * @param invitorRole - The role of the user sending the invitation.
   * @param invitedUserRole - The role assigned to the user being invited.
   * @returns True if the inviter can assign the requested role, otherwise false.
   */
  static checkRoleHierarchy(
    invitorRole: TStoryCollaboratorRole,
    invitedUserRole: TStoryCollaboratorRole
  ): boolean {
    return ROLE_HIERARCHY[invitorRole] >= ROLE_HIERARCHY[invitedUserRole];
  }

  static getCollaboratorLavel(role: TStoryCollaboratorRole): number {
    return ROLE_HIERARCHY[role];
  }

  static hasMinimumStoryRole(
    userRole: TStoryCollaboratorRole,
    requiredRole: TStoryCollaboratorRole
  ): boolean {
    return (
      StoryCollaboratorRules.getCollaboratorLavel(userRole) >=
      StoryCollaboratorRules.getCollaboratorLavel(requiredRole)
    );
  }

  static hasStoryPermission(
    role: TStoryCollaboratorRole,
    permission: TStoryCollaboratorPermission
  ): boolean {
    const roleConfig = STORY_ROLES[role];
    if (!roleConfig) return false;
    return roleConfig.permissions[permission] === true;
  }
}
