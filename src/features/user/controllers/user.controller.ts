import { TClerkUserIdParamsSchema } from '@/schema/request/commonRequest.schema';
import { HTTP_STATUS } from '@constants/httpStatus';
import { TOKENS } from '@container/tokens';
import {
  TBanUserSchema,
  TChangeUserRoleSchema,
  TGetUserByClerkIdSchema,
  TGetUserByIdSchema,
  TGetUserByUsernameSchema,
  TGetUsersListQuerySchema,
  TSearchUserByUsernameSchema,
} from '@schema/request/user.schema';
import { UserTransformer } from '@transformer/user.transformer';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { UserService } from '../services/user.service';

// 28fc309c4d24beca62b7904eccf48cf70a93257ede72548c3c3a5c28f80b2b76

@singleton()
class UserController extends BaseModule {
  constructor(
    @inject(TOKENS.UserService)
    private userService: UserService
  ) {
    super();
  }

  getCurrentUserDetails = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await request.user;
    const activeBan = await this.userService.getUserActiveBan(user.clerkId);

    const responseData = UserTransformer.currentUserResponse(user, activeBan);

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

  getUsersList = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TGetUsersListQuerySchema }>,
      reply: FastifyReply
    ) => {
      const query = request.query;

      const result = await this.userService.getPaginatedUsers(query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(result, 'Users list fetched successfully'));
    }
  );

  getUserDetailPageByClerkId = catchAsync(
    async (request: FastifyRequest<{ Params: TGetUserByClerkIdSchema }>, reply: FastifyReply) => {
      const { clerkId } = request.params;

      const data = await this.userService.getUserDetailPageDataByClerkId(clerkId);

      this.logInfo(`Fetched user detail page data for clerkId ${clerkId}`);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(data, 'User detail page data fetched successfully'));
    }
  );

  banUser = catchAsync(
    async (
      request: FastifyRequest<{ Params: TClerkUserIdParamsSchema; Body: TBanUserSchema }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const { userId } = request.params;
      const { reason, durationDays } = request.body;
      const result = await this.userService.banUser({
        reviewerId,
        userId,
        reason,
        durationDays,
      });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(result, 'User banned successfully'));
    }
  );

  changeUserRole = catchAsync(
    async (
      request: FastifyRequest<{ Params: TClerkUserIdParamsSchema; Body: TChangeUserRoleSchema }>,
      reply: FastifyReply
    ) => {
      const currentUserId = request.user.clerkId;
      const { userId } = request.params;
      const { role } = request.body;

      await this.userService.changeUserRole({ currentUserId, userId, role });

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.fetched(null, 'User role changed successfully'));
    }
  );

  dropCollections = catchAsync(async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.userService.dropCollectionsExceptUsersAndRoles();

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.fetched(result, 'Database collections dropped successfully'));
  });
}

export { UserController };

// export const userController = new UserController();
