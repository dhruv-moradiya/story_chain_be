import { PlatformRoleValidator } from './validators/platformRole.validator';
import { PlatformRoleRepository } from './repository/platformRole.repository';
import { ApiError } from '../../utils/apiResponse';
import { IPlatformRole } from './platformRole.types';

export class PlatformRoleService {
  private readonly repo = new PlatformRoleRepository();
  private readonly validator = new PlatformRoleValidator();

  /**
   * Assign a platform role to a user
   * Only SUPER_ADMIN can assign roles
   */
  async assignPlatformRole(userId: string, role: IPlatformRole['role'], assignedBy: string) {
    // 🔒 Permission check
    await this.validator.validateIsSuperAdmin(assignedBy);

    // 🧩 Update or create
    const updated = await this.repo.createOrUpdate({
      userId,
      role,
      assignedBy,
      assignedAt: new Date(),
    });

    if (!updated) throw ApiError.internalError('Failed to assign platform role');

    return updated;
  }

  /**
   * Revoke a user's platform role (resets to USER)
   * Only SUPER_ADMIN can perform this
   */
  async revokePlatformRole(userId: string, performedBy: string) {
    await this.validator.validateIsSuperAdmin(performedBy);

    const updated = await this.repo.createOrUpdate({
      userId,
      role: 'USER',
      assignedBy: performedBy,
      assignedAt: new Date(),
    });

    if (!updated) throw ApiError.internalError('Failed to revoke platform role');

    return updated;
  }

  /**
   * Get a user's current platform role
   */
  async getUserRole(userId: string) {
    const role = await this.repo.findByUserId(userId);
    return role ?? { userId, role: 'USER' }; // default to USER
  }

  /**
   * Get all platform admins/moderators
   */
  async getAllAdmins() {
    return this.repo.getAllAdmins();
  }
}
