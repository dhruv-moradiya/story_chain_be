import { WebhookEvent } from '@clerk/fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { catchAsync } from '@utils/catchAsync';
import { logger } from '@utils/logger';
import { WebhookTransformer } from '../builders/webhook.transformer';
import { UserService } from '../services/user.service';

@singleton()
class UserWebhookController {
  constructor(
    @inject(TOKENS.UserService)
    private readonly userService: UserService,
    @inject(TOKENS.WebhookTransformer)
    private readonly transformer: WebhookTransformer
  ) {}

  handle = catchAsync(async (req: FastifyRequest, reply: FastifyReply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = (req as any).clerkEvent as WebhookEvent;

    if (!event?.type) {
      return reply
        .code(HTTP_STATUS.BAD_REQUEST.code)
        .send(ApiResponse.fetched({}, 'Invalid webhook payload'));
      // .send(new ApiResponse(false, 'Invalid webhook payload'));
    }

    switch (event.type) {
      // ----------------------------
      // USER CREATED
      // ----------------------------
      case 'user.created': {
        const parsed = this.transformer.transformUserCreated(event.data);

        // createUser now handles duplicates gracefully (idempotent)
        // If user already exists (created via JIT), it returns the existing user
        const user = await this.userService.createUser(parsed);

        logger.info(`[Webhook] User created/found: ${user.clerkId}`);

        return reply
          .code(HTTP_STATUS.CREATED.code)
          .send(ApiResponse.created({ userId: user.clerkId }, 'User created'));
        // .send(new ApiResponse(true, 'User created', { userId: user.clerkId }));
      }

      // ----------------------------
      // SESSION CREATED
      // ----------------------------
      case 'session.created': {
        const parsed = this.transformer.transformSessionCreated(event.data);

        await this.userService.createSession(parsed);

        return reply
          .code(HTTP_STATUS.CREATED.code)
          .send(ApiResponse.created({}, 'Session created'));
      }

      default:
        return reply
          .code(HTTP_STATUS.OK.code)
          .send(ApiResponse.fetched({}, `Ignored event: ${event.type}`));
    }
  });
}

export { UserWebhookController };
