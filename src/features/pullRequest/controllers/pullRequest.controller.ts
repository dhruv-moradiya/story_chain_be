import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ApiResponse } from '@utils/apiResponse';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';

import {
  TCreatePRFromDraftBody,
  TCreatePRFromAutoSaveBody,
} from '@schema/request/pullRequest.schema';
import { PullRequestCommandService } from '../services/pullRequest-command.service';

@singleton()
export class PullRequestController extends BaseModule {
  constructor(
    @inject(TOKENS.PullRequestCommandService)
    private readonly prCommandService: PullRequestCommandService
  ) {
    super();
  }

  /**
   * POST /api/pull-requests/stories/:slug/from-draft
   *
   * Creates a new PR from an existing draft chapter owned by the current user.
   */
  createFromDraft = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { slug: string };
        Body: TCreatePRFromDraftBody;
      }>,
      reply: FastifyReply
    ) => {
      const authorId = request.user.clerkId;
      const storySlug = request.params.slug;
      const body = request.body;

      const pr = await this.prCommandService.createFromDraft({
        chapterSlug: body.chapterSlug,
        storySlug,
        title: body.title,
        description: body.description,
        parentChapterSlug: body.parentChapterSlug,
        prType: body.prType,
        isDraft: body.isDraft,
        draftReason: body.draftReason,
        authorId,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(pr, 'Pull request created successfully from draft chapter.'));
    }
  );

  /**
   * POST /api/pull-requests/stories/:slug/from-autosave
   *
   * Creates a new PR from an auto-saved chapter draft.
   */
  createFromAutoSave = catchAsync(
    async (
      request: FastifyRequest<{
        Params: { slug: string };
        Body: TCreatePRFromAutoSaveBody;
      }>,
      reply: FastifyReply
    ) => {
      const authorId = request.user.clerkId;
      const body = request.body;

      const pr = await this.prCommandService.createFromAutoSave({
        autoSaveId: body.autoSaveId,
        title: body.title,
        description: body.description,
        parentChapterSlug: body.parentChapterSlug,
        prType: body.prType,
        isDraft: body.isDraft,
        draftReason: body.draftReason,
        authorId,
      });

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.created(pr, 'Pull request created successfully from auto-save.'));
    }
  );
}
