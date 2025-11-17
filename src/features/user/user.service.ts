import { withTransaction } from '../../utils/withTransaction';
import { BaseModule } from '../../utils';
import { UserRepository } from './repository/user.repository';
import { UserValidator } from './validators/user.validators';
import { WebhookTransformer } from './builders/webhook.transformer';
import { ISessionCreateDTO, IUserCreateDTO } from './dto/user.dto';

export class UserService extends BaseModule {
  private readonly userRepo = new UserRepository();
  private readonly validator = new UserValidator(this.userRepo);
  private readonly transformer = new WebhookTransformer();

  // -------------------------------------------------------
  // CREATE USER (Webhooks)
  // -------------------------------------------------------
  async createUser(input: IUserCreateDTO) {
    return await withTransaction('Creating new user', async () => {
      const newUser = await this.userRepo.createNewUser(input);

      return newUser;
    });
  }

  async createSession(input: ISessionCreateDTO) {
    this.logInfo('Session is created', { input });
  }
}

export const userService = new UserService();
