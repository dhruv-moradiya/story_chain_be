import { FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import {
  TSearchUserByUsernameSchema,
  TGetUserByIdSchema,
  TGetUserByUsernameSchema,
} from '@schema/request/user.schema';
import { UserService } from '../services/user.service';
import { UserTransformer } from '@transformer/user.transformer';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';

@singleton()
class UserController extends BaseModule {
  constructor(
    @inject(TOKENS.UserService)
    private userService: UserService
  ) {
    super();
  }

  getCurrentUserDetails = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    const responseData = UserTransformer.currentUserResponse(user);

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.fetched(responseData, 'User details fetched successfully'));
  });

  getUserById = catchAsync(
    async (request: FastifyRequest<{ Params: TGetUserByIdSchema }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.throwNotFoundError('User not found.');
      }

      const responseData = UserTransformer.publicUserResponse(user);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(responseData, 'User fetched successfully'));
    }
  );

  getUserByUsername = catchAsync(
    async (request: FastifyRequest<{ Params: TGetUserByUsernameSchema }>, reply: FastifyReply) => {
      const { username } = request.params;

      const user = await this.userService.getUserByUsername(username);

      if (!user) {
        this.throwNotFoundError('User not found.');
      }

      const responseData = UserTransformer.publicUserResponse(user);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(responseData, 'User fetched successfully'));
    }
  );

  searchUserByUsername = catchAsync(
    async (request: FastifyRequest<{ Body: TSearchUserByUsernameSchema }>, reply: FastifyReply) => {
      const username = request.body.username;

      const users = await this.userService.searchUserByUsername({ username });

      const responseData = users.map((user) => UserTransformer.searchItemResponse(user));

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.fetched(
            responseData,
            users.length === 0
              ? `No users found matching "${username}".`
              : `${users.length} user${users.length > 1 ? 's' : ''} found.`
          )
        );
    }
  );
}

export { UserController };

// export const userController = new UserController();
