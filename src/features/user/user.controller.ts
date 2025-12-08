import { FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { BaseModule } from '../../utils/baseClass';
import { catchAsync } from '../../utils/catchAsync';
import { TSearchUserByUsernameSchema } from '../../schema/user.schema';
import { userService } from './user.service';

export class UserController extends BaseModule {
  getCurrentUserDetails = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Your draft stories fetched successfully', user));
  });

  searchUserByUsername = catchAsync(
    async (request: FastifyRequest<{ Body: TSearchUserByUsernameSchema }>, reply: FastifyReply) => {
      const username = request.body.username;

      const users = await userService.searchUserByUsername({ username });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          new ApiResponse(
            true,
            users.length === 0
              ? `No users found matching “${username}”.`
              : `${users.length} user${users.length > 1 ? 's' : ''} found.`,
            users
          )
        );
    }
  );
}

export const userController = new UserController();
