import { withTransaction } from '../../utils/withTransaction';
import { PlatformRoleService } from '../platformRole/platformRole.service';
import { ISessionCreateDTO, IUserCreateDTO } from './dto/user.dto';
import { UserRepository } from './repository/user.repository';
import { UserRules } from './rules/user.rules';

export class UserService {
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async (session) => {
      const newUser = await this.userRepo.create(input, { session });

      const totalUsers = await this.userRepo.count({}, { session });

      // pure domain logic
      const role = UserRules.determineInitialRole(totalUsers);

      // call another service inside same TX
      await this.platformRoleService.assignRole({ userId: newUser.clerkId, role }, { session });

      return newUser;
    });
  }

  async createSession(input: ISessionCreateDTO) {
    // this.logInfo('Session is created', { input });
  }
}

export const userService = new UserService();
