import { withTransaction } from '../../utils/withTransaction';
import { PlatformRoleService } from '../platformRole/platformRole.service';
import { ISearchUserByUsernameDTO, ISessionCreateDTO, IUserCreateDTO } from '../../dto/user.dto';
import { UserRepository } from './repository/user.repository';
import { UserRules } from '../../domain/user.rules';
import { IUser } from './user.types';

export class UserService {
  private readonly userRepo = new UserRepository();
  private readonly platformRoleService = new PlatformRoleService();

  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async (session) => {
      const newUser = await this.userRepo.create(input, { session });

      const totalUsers = await this.userRepo.count({}, { session });

      const role = UserRules.determineInitialRole(totalUsers);

      await this.platformRoleService.assignRole({ userId: newUser.clerkId, role }, { session });

      return newUser;
    });
  }

  async createSession(input: ISessionCreateDTO) {
    // this.logInfo('Session is created', { input });
  }

  async searchUserByUsername(input: ISearchUserByUsernameDTO): Promise<IUser[]> {
    const { username } = input;

    return this.userRepo.findByUsername(username);
  }
}

export const userService = new UserService();
