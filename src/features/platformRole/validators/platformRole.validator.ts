import { BaseModule } from '../../../utils';
import { ApiError } from '../../../utils/apiResponse';
import { PlatformRoleRepository } from '../repository/platformRole.repository';

export class PlatformRoleValidator extends BaseModule {
  private readonly repo = new PlatformRoleRepository();

  async validateUserHasRole(userId: string) {
    const role = await this.repo.findByUserId(userId);
    if (!role) throw this.throwUnauthorizedError('User does not have a platform role');
    return role;
  }

  async validateIsSuperAdmin(userId: string) {
    const role = await this.repo.findByUserId(userId);
    if (!role || role.role !== 'SUPER_ADMIN') {
      throw ApiError.forbidden('Only Super Admin can perform this action');
    }
    return role;
  }
}
