import { BaseModule } from '@utils/baseClass';
import { singleton } from 'tsyringe';

@singleton()
export class CommentVoteController extends BaseModule {
  constructor() {
    super();
  }

  // Example method
  // vote = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
  //   return reply.code(HTTP_STATUS.OK.code).send(ApiResponse.success(null, 'Voted'));
  // });
}
