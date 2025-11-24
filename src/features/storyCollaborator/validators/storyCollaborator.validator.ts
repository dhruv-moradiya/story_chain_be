import { BaseModule } from '../../../utils/baseClass';
import { StoryCollaboratorRepository } from '../repository/storyCollaborator.repository';

export class StoryCollaboratorValidator extends BaseModule {
  private readonly repo: StoryCollaboratorRepository;

  constructor(repo?: StoryCollaboratorRepository) {
    super();
    // Allow injecting a mock repo for tests; otherwise create a real one.
    this.repo = repo ?? new StoryCollaboratorRepository();
  }

  /**
   * Ensure a collaborator exists for the given story and user.
   * Throws a validation error if not found.
   */
  async validateCollaboratorExists(storyId: string, userId: string) {
    const collaborator = await this.repo.findByStoryAndUser(storyId, userId);
    if (!collaborator) {
      this.throwValidationError('Collaborator not found');
    }
    return collaborator;
  }

  /**
   * Ensure the collaborator has the requested permission (e.g. canApprove).
   * Throws forbidden error when the permission is missing.
   */
  async validateHasPermission(storyId: string, userId: string, permission: string) {
    const collaborator = await this.validateCollaboratorExists(storyId, userId);

    // @ts-expect-error runtime check: collaborator may be plain object
    if (!collaborator.permissions || !collaborator.permissions[permission]) {
      this.throwForbiddenError('User does not have required permission');
    }

    return collaborator;
  }
}
