import { clerkClient, SignInToken } from '@clerk/fastify';
import { TOKENS } from '@container/tokens';
import { UserRules } from '@domain/user.rules';
import {
  ILoginUserDTO,
  ISearchUserByUsernameDTO,
  ISessionCreateDTO,
  IUserCreateDTO,
} from '@dto/user.dto';
import { PlatformRoleService } from '@features/platformRole/services/platformRole.service';
import { BaseModule } from '@utils/baseClass';
import { withTransaction } from '@utils/withTransaction';
import { inject, singleton } from 'tsyringe';
import { IUserService } from '../interfaces';
import { UserRepository } from '../repositories/user.repository';
import { IUser } from '../types/user.types';

@singleton()
class UserService extends BaseModule implements IUserService {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly userRepo: UserRepository,
    @inject(TOKENS.PlatformRoleService)
    private readonly platformRoleService: PlatformRoleService
  ) {
    super();
  }

  // For POSTMAN testing purposes
  async loginUser(input: ILoginUserDTO): Promise<SignInToken> {
    const signToken = await clerkClient.signInTokens.createSignInToken({
      userId: input.userId,
      expiresInSeconds: 2592000,
    });

    if (!signToken.token) {
      this.throwUnauthorizedError('Failed to generate sign-in token.');
    }

    return signToken;
  }

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
    this.logInfo('Session is created', { input });
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return this.userRepo.findByClerkId(userId);
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    return this.userRepo.findOneByUsername(username);
  }

  async searchUserByUsername(input: ISearchUserByUsernameDTO): Promise<IUser[]> {
    const { username } = input;

    return this.userRepo.findByUsername(username);
  }
}

export { UserService };
