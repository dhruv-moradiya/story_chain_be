import { BaseValidator } from '../../../utils';
import { UserRepository } from '../repository/user.repository';
import { ICreateNewUser, IUserUpdateInput } from '../user.types';
import { UserJSON } from '@clerk/fastify';

export class UserValidator extends BaseValidator {
  private readonly userRepo: UserRepository;

  constructor(userrRepo: UserRepository) {
    super();

    this.userRepo = new UserRepository();
  }

  validate(input: UserJSON) {
    this.logInfo("Validating new user's input: ", { input });
  }

  validateProfileUpdate(input: IUserUpdateInput) {
    this.logInfo('Validating user update info', { input });
  }
}
