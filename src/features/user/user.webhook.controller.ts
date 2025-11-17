import { FastifyReply, FastifyRequest } from 'fastify';
import { WebhookTransformer } from './builders/webhook.transformer';
import { catchAsync } from '../../utils/catchAsync';
import { HTTP_STATUS } from '../../constants/httpStatus';
import { ApiResponse } from '../../utils/apiResponse';
import { userService } from './user.service';
import { logger } from '../../utils/logger';
import { WebhookEvent } from '@clerk/fastify';

export class UserWebhookController {
  private logger = logger;
  private static transformer = new WebhookTransformer();

  static handle = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    const event = (req as any).clerkEvent as WebhookEvent;

    if (!event?.type) {
      return reply
        .code(HTTP_STATUS.BAD_REQUEST.code)
        .send(new ApiResponse(false, 'Invalid webhook payload'));
    }

    switch (event.type) {
      // ----------------------------
      // USER CREATED
      // ----------------------------
      case 'user.created': {
        const parsed = UserWebhookController.transformer.transformUserCreated(event.data);

        await userService.createUser(parsed);

        return reply.code(HTTP_STATUS.CREATED.code).send(new ApiResponse(true, 'User created'));
      }

      // ----------------------------
      // SESSION CREATED
      // ----------------------------
      case 'session.created': {
        const parsed = UserWebhookController.transformer.transformSessionCreated(event.data);

        await userService.createSession(parsed);

        return reply.code(HTTP_STATUS.CREATED.code).send(new ApiResponse(true, 'Session created'));
      }

      default:
        return reply
          .code(HTTP_STATUS.OK.code)
          .send(new ApiResponse(true, `Ignored event: ${event.type}`));
    }
  });
}
