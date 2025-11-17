import { FastifyReply, FastifyRequest } from 'fastify';
import { catchAsync } from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { userService } from './user.service';
export class UserController {
  // -------------------------------------------------------
  // PROFILE (BY ID)
  // -------------------------------------------------------
  static getUserById = catchAsync(
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = req.params.id;

      const user = await userService.getUserById(id);

      return reply.code(200).send(new ApiResponse(true, 'User fetched', user));
    }
  );

  // -------------------------------------------------------
  // CURRENT PROFILE (AUTH)
  // -------------------------------------------------------
  static getCurrentUser = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    const clerkId = (req as any).userId;
    if (!clerkId) return reply.code(401).send(new ApiResponse(false, 'Unauthorized'));

    const user = await userService.getUserByClerkId(clerkId);

    return reply.code(200).send(new ApiResponse(true, 'User fetched', user));
  });

  // -------------------------------------------------------
  // UPDATE PROFILE
  // -------------------------------------------------------
  static updateProfile = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = UpdateUserProfileDTO.parse(req.body);

    const user = await userService.updateProfile(parsed);

    return reply.code(200).send(new ApiResponse(true, 'Profile updated', user));
  });

  // -------------------------------------------------------
  // DELETE (SOFT)
  // -------------------------------------------------------
  static deleteUser = catchAsync(
    async (req: FastifyRequest<{ Params: { clerkId: string } }>, reply: FastifyReply) => {
      await userService.deleteUser(req.params.clerkId);

      return reply.code(200).send(new ApiResponse(true, 'User deleted'));
    }
  );
}
