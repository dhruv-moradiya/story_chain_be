import { ClientSession } from 'mongoose';
import { PlatformRole } from '../../types';
import { PlatformRoleRepository } from './repository/platformRole.repository';
import { PlatformRoleValidator } from './validators/platformRole.validator';
import { IPlatformRole } from './platformRole.types';

export class PlatformRoleService {
  private readonly repo = new PlatformRoleRepository();
  private readonly validator = new PlatformRoleValidator();

  async assignRole(
    input: { userId: string; role: PlatformRole },
    options?: { session?: ClientSession }
  ): Promise<IPlatformRole> {
    return await this.repo.create(
      {
        userId: input.userId,
        role: input.role,
      },
      { session: options?.session }
    );
  }

  async assignPlatformRole(userId: string, role: PlatformRole, assignedBy: string) {
    await this.validator.validateIsSuperAdmin(assignedBy);

    return this.repo.createOrUpdate({
      userId,
      role,
      assignedBy,
      assignedAt: new Date(),
    });
  }
}

export const platformRoleService = new PlatformRoleService();
