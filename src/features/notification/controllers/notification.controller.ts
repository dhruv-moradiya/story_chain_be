import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { NotificationService } from '../services/notification.service';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';

@singleton()
export class NotificationController extends BaseModule {
  constructor(
    @inject(TOKENS.NotificationService)
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  getUserNotifications = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request;

    const userId = user.clerkId;

    const notifications = await this.notificationService.getCurrentUserNotifications({ userId });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(new ApiResponse(true, 'Notifications fetched successfully.', notifications));
  });
}
