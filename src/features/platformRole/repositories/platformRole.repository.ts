import { singleton } from 'tsyringe';
import { PlatformRole } from '@models/platformRole.model';
import { IPlatformRole, IPlatformRoleDoc } from '../types/platformRole.types';
import { ApiError } from '@utils/apiResponse';
import { ClientSession } from 'mongoose';
import { BaseRepository } from '@utils/baseClass';

@singleton()
export class PlatformRoleRepository extends BaseRepository<IPlatformRole, IPlatformRoleDoc> {
  constructor() {
    super(PlatformRole);
  }

  async findByUserId(userId: string) {
    return PlatformRole.findOne({ userId });
  }

  async createOrUpdate(data: IPlatformRole, options?: { session?: ClientSession }) {
    return PlatformRole.findOneAndUpdate(
      { userId: data.userId },
      { $set: data },
      { upsert: true, new: true, session: options?.session }
    );
  }

  async deleteByUserId(userId: string, options?: { session?: ClientSession }) {
    const result = await PlatformRole.deleteOne({ userId }, options);
    if (result.deletedCount === 0) throw ApiError.notFound('Platform role not found');
  }

  async getAllAdmins() {
    return PlatformRole.find({ role: { $in: ['SUPER_ADMIN', 'PLATFORM_MODERATOR'] } });
  }
}
