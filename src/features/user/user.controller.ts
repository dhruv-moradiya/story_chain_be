import { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { WebhookEvent } from '@clerk/fastify';

import { catchAsync } from '../../utils/catchAsync';
import { UserService } from './user.service';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';

export class UserController {
  /**
   * Builds a readable description of user’s device and location
   */
  private static createUserAgent(
    activity?: {
      device_type?: string | null;
      is_mobile?: boolean;
      browser_name?: string | null;
      browser_version?: string | null;
      city?: string | null;
      country?: string | null;
      ip_address?: string | null;
    } | null
  ): string | null {
    if (!activity) return null;

    const deviceType = activity.device_type ?? (activity.is_mobile ? 'Mobile' : 'Desktop');
    const browser = activity.browser_name
      ? `${activity.browser_name}${activity.browser_version ? ` ${activity.browser_version}` : ''}`
      : 'Unknown Browser';
    const location = [activity.city, activity.country].filter(Boolean).join(', ');
    const ip = activity.ip_address ?? 'N/A';

    return `${browser} (${deviceType})${location ? ` - ${location}` : ''} [IP: ${ip}]`;
  }

  /**
   * Handle Clerk webhook events (user/session lifecycle)
   */
  static handleWebhookEvents = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const event = (request as any).clerkEvent as WebhookEvent | undefined;

    if (!event?.type) {
      logger.warn('Webhook received without a valid event type');
      return reply
        .code(HTTP_STATUS.BAD_REQUEST.code)
        .send(new ApiResponse(false, 'Invalid webhook payload'));
    }

    try {
      switch (event.type) {
        case 'user.created': {
          // Narrow to Clerk's user JSON payload
          const data = event.data;
          if (data.object !== 'user' || !data.id || !data.email_addresses?.length) {
            logger.error('Invalid user.created event payload:', data);
            return reply
              .code(HTTP_STATUS.BAD_REQUEST.code)
              .send(new ApiResponse(false, 'Invalid user.created data'));
          }

          const userData = {
            clerkId: data.id,
            username: data.username ?? '',
            email: data.email_addresses[0].email_address,
          };

          await UserService.saveNewUser(userData);
          logger.info(`User created: ${userData.email}`);

          return reply
            .code(HTTP_STATUS.CREATED.code)
            .send(new ApiResponse(true, HTTP_STATUS.CREATED.message));
        }

        case 'session.created': {
          // Type guard: ensure it's a session object
          if (event.data.object !== 'session') {
            return reply
              .code(HTTP_STATUS.BAD_REQUEST.code)
              .send(new ApiResponse(false, 'Invalid session.created payload'));
          }

          const data = event.data;
          const { id, user_id, client_id, last_active_at, latest_activity } = data;

          const sessionData = {
            sessionId: id,
            userId: user_id,
            clientId: client_id,
            status: 'active' as const,
            ip: latest_activity?.ip_address ?? null,
            userAgent: UserController.createUserAgent(latest_activity),
            createdAt: new Date(data.created_at * 1000),
            lastActiveAt: new Date(last_active_at * 1000),
          };

          // Optionally persist session info
          // await UserService.saveUserSession(sessionData);

          logger.info(`Session created for user: ${sessionData.userId}`);

          return reply
            .code(HTTP_STATUS.CREATED.code)
            .send(new ApiResponse(true, HTTP_STATUS.CREATED.message));
        }

        default:
          logger.info(`Unhandled webhook event: ${event.type}`);
          return reply.code(HTTP_STATUS.OK.code).send(new ApiResponse(true, 'Event received'));
      }
    } catch (err) {
      logger.error(`Error handling webhook (${event.type}):`, err);
      return reply
        .code(HTTP_STATUS.BAD_REQUEST.code)
        .send(new ApiResponse(false, 'Webhook handling failed'));
    }
  });

  /**
   * Fetch user profile by MongoDB ID
   */
  static getUserProfile = catchAsync(
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST.code)
          .send(new ApiResponse(false, 'Invalid user ID'));
      }

      const userProfile = await UserService.getUserProfileById(id);
      if (!userProfile) {
        return reply
          .code(HTTP_STATUS.NOT_FOUND.code)
          .send(new ApiResponse(false, 'User not found'));
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, HTTP_STATUS.OK.message, userProfile));
    }
  );

  /**
   * Fetch current logged-in user profile (by Clerk ID)
   */
  static getCurrentUserProfile = catchAsync(
    async (request: FastifyRequest, reply: FastifyReply) => {
      const clerkUserId = (request as any).userId;
      if (!clerkUserId) {
        return reply
          .code(HTTP_STATUS.UNAUTHORIZED.code)
          .send(new ApiResponse(false, 'Unauthorized'));
      }

      const userProfile = await UserService.getUserProfileByClerkId(clerkUserId);
      if (!userProfile) {
        return reply
          .code(HTTP_STATUS.NOT_FOUND.code)
          .send(new ApiResponse(false, 'User not found'));
      }

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(new ApiResponse(true, HTTP_STATUS.OK.message, userProfile));
    }
  );
}
