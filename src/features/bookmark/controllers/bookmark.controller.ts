import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@constants/httpStatus';
import { BookmarkService } from '../services/bookmark.service';
import { CreateBookmarkInput } from '../schema/bookmark.schema';

@singleton()
export class BookmarkController extends BaseModule {
  constructor(
    @inject(TOKENS.BookmarkService)
    private readonly bookmarkService: BookmarkService
  ) {
    super();
  }

  toggleBookmark = catchAsync(
    async (request: FastifyRequest<{ Body: CreateBookmarkInput }>, reply: FastifyReply) => {
      const userId = request.user.clerkId;
      const input = request.body;

      const result = await this.bookmarkService.toggleBookmark(userId, input);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', HTTP_STATUS.OK.message, 'UPDATED'));
    }
  );

  getBookmarks = catchAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.clerkId;

    const result = await this.bookmarkService.getBookmarks(userId, {
      query: '',
      order: 'oldest',
      page: 1,
      limit: 10,
    });

    return reply
      .code(HTTP_STATUS.OK.code)
      .send(ApiResponse.success(result, 'OK', HTTP_STATUS.OK.message, 'FETCHED'));
  });
}
// bookmark controller file
