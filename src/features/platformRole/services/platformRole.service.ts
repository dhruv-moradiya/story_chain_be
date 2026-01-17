import { ClientSession } from 'mongoose';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { PlatformRoleRepository } from '../repositories/platformRole.repository';
import { PlatformRoleValidator } from '../validators/platformRole.validator';
import { IPlatformRole, PlatformRole } from '../types/platformRole.types';

@singleton()
export class PlatformRoleService {
  constructor(
    @inject(TOKENS.PlatformRoleRepository)
    private readonly repo: PlatformRoleRepository,
    private readonly validator: PlatformRoleValidator = new PlatformRoleValidator()
  ) {}

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
