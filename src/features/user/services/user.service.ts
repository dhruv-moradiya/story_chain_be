import { TOKENS } from '@container/tokens';
import type { User } from '@clerk/fastify';
import { UserRules } from '@domain/user.rules';
import {
  ISearchUserByUsernameDTO,
  ISessionCreateDTO,
  IUserCreateDTO,
  IUserUpdateDTO,
} from '@dto/user.dto';
import { PlatformRoleService } from '@features/platformRole/services/platformRole.service';
import { BaseModule } from '@utils/baseClass';
import { fetchClerkUser } from '@utils/clerk.client';
import { withTransaction } from '@utils/withTransaction';
import { inject, singleton } from 'tsyringe';
import { IUserService } from '../interfaces';
import { UserRepository } from '../repositories/user.repository';
import { IConnectedAccount, IUser, TAuthProvider } from '../types/user.types';

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

  /**
   * Get or create user - handles race condition between webhook and /me endpoint
   * Called by auth middleware to ensure user always exists
   */
  async getOrCreateUser(clerkId: string): Promise<IUser> {
    // 1. Try to find existing user
    const existingUser = await this.userRepo.findByClerkId(clerkId);

    if (existingUser) {
      return existingUser;
    }

    // 2. User not found - fetch from Clerk and create (JIT - Just-In-Time)
    this.logInfo(`[JIT] User ${clerkId} not found in DB, fetching from Clerk...`);

    const clerkUser = await fetchClerkUser(clerkId);

    if (!clerkUser) {
      this.throwNotFoundError('User not found in Clerk');
    }

    // 3. Create user with JIT data
    const user = await this.createUser({
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      username: clerkUser.username,
      avatarUrl: clerkUser.avatarUrl,
      authProvider: 'email',
      primaryAuthMethod: 'email',
      connectedAccounts: [],
      emailVerified: true, // Assumed verified if fetching from Clerk successfully
    });

    this.logInfo(`[JIT] User ${clerkId} created successfully`);

    return user;
  }

  /**
   * Create user - handles duplicates gracefully
   * Used by both webhook and JIT creation
   */
  async createUser(input: IUserCreateDTO): Promise<IUser> {
    try {
      return await withTransaction('Creating new user', async (session) => {
        // Check if user already exists (handle race between webhook and JIT)
        const existingUser = await this.userRepo.findOne({ clerkId: input.clerkId }, null, {
          session,
        });

        if (existingUser) {
          this.logInfo(`[CreateUser] User ${input.clerkId} already exists, returning existing`);
          return existingUser;
        }

        const newUser = await this.userRepo.create(input, { session });

        const totalUsers = await this.userRepo.count({}, { session });

        const role = UserRules.determineInitialRole(totalUsers);

        await this.platformRoleService.assignRole({ userId: newUser.clerkId, role }, { session });

        return newUser;
      });
    } catch (error: unknown) {
      // Handle MongoDB duplicate key error (code 11000)
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        this.logInfo(
          `[CreateUser] Duplicate key detected for ${input.clerkId}, fetching existing user`
        );

        const existingUser = await this.userRepo.findByClerkId(input.clerkId);
        if (existingUser) {
          return existingUser;
        }
      }
      throw error;
    }
  }

  async createSession(input: ISessionCreateDTO) {
    this.logInfo('Session is created', { input });
  }

  async updateUserFromClerk(input: IUserUpdateDTO): Promise<void> {
    const user = await this.userRepo.findByClerkId(input.clerkId);

    if (!user) {
      this.logInfo(`[UpdateUser] User ${input.clerkId} not found for update`);
      return;
    }

    // Check for email conflicts before updating
    if (input.email && input.email !== user.email) {
      const existingUser = await this.userRepo.findByEmail(input.email);
      if (existingUser && existingUser.clerkId !== input.clerkId) {
        this.logError(`[UpdateUser] Email ${input.email} already in use by another user`);
        return;
      }
    }

    await this.userRepo.updateByClerkId(input.clerkId, input);
    this.logInfo(`[UpdateUser] User ${input.clerkId} updated successfully`);
  }

  async handleUserDeleted(clerkId: string): Promise<void> {
    const user = await this.userRepo.findByClerkId(clerkId);
    if (!user) {
      this.logInfo(`[DeleteUser] User ${clerkId} not found for deletion`);
      return;
    }

    await this.platformRoleService.deleteRole(clerkId);
    await this.userRepo.deleteByClerkId(clerkId);
    this.logInfo(`[DeleteUser] User ${clerkId} deleted successfully`);
  }

  async syncConnectedAccounts(clerkId: string, externalAccounts: User['externalAccounts']) {
    const providersMap = new Map<string, IConnectedAccount>();

    for (const account of externalAccounts) {
      let provider: TAuthProvider;
      if (account.provider.includes('google')) provider = 'google';
      else if (account.provider.includes('github')) provider = 'github';
      else if (account.provider.includes('discord')) provider = 'discord';
      else continue;

      providersMap.set(provider, {
        provider,
        providerAccountId: account.id,
        email: account.emailAddress,
        username: account.username || undefined,
        avatarUrl: account.imageUrl || undefined,
        connectedAt: new Date(Date.now()),
      });
    }

    const connectedAccounts = Array.from(providersMap.values());

    await this.userRepo.updateByClerkId(clerkId, { connectedAccounts });
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
