import { FastifyReply, FastifyRequest } from 'fastify';
import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@constants/httpStatus';
import { ReportService } from '../services/report.service';
import {
  TBanUserFromStoryInput,
  TCreateReportInput,
  TPaginatedReportQueryParamsInput,
  TPlatformBanUserInput,
  TPlatformResolveReportInput,
  TReportIdParamsInput,
  TResolveStoryReportInput,
  TStoryReportParamsInput,
  TStorySlugParamsInput,
  TStoryUserBanParamsInput,
  TUpdateReportStatusInput,
} from '@/schema/request/report.schema';

@singleton()
export class ReportController extends BaseModule {
  constructor(
    @inject(TOKENS.ReportService)
    private readonly reportService: ReportService
  ) {
    super();
  }

  // ═══════════════════════════════════════════
  // USER ENDPOINTS
  // ═══════════════════════════════════════════

  createReport = catchAsync(
    async (request: FastifyRequest<{ Body: TCreateReportInput }>, reply: FastifyReply) => {
      const reporterId = request.user.clerkId;
      const result = await this.reportService.createReport(reporterId, request.body);

      return reply
        .code(HTTP_STATUS.CREATED.code)
        .send(ApiResponse.success(result, 'CREATED', 'Report created successfully.', 'CREATED'));
    }
  );

  getMyReports = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TPaginatedReportQueryParamsInput }>,
      reply: FastifyReply
    ) => {
      const reporterId = request.user.clerkId;
      const result = await this.reportService.getUserReports(reporterId, request.query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Reports retrieved successfully.', 'FETCHED'));
    }
  );

  getMyReportById = catchAsync(
    async (request: FastifyRequest<{ Params: TReportIdParamsInput }>, reply: FastifyReply) => {
      const reporterId = request.user.clerkId;
      const result = await this.reportService.getUserReportById(
        reporterId,
        request.params.reportId
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Report details retrieved.', 'FETCHED'));
    }
  );

  // ═══════════════════════════════════════════
  // STORY-LEVEL MODERATION ENDPOINTS
  // ═══════════════════════════════════════════

  getStoryReports = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TStorySlugParamsInput;
        Querystring: TPaginatedReportQueryParamsInput;
      }>,
      reply: FastifyReply
    ) => {
      const result = await this.reportService.getStoryReports(
        request.params.storySlug,
        request.query
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Story reports retrieved.', 'FETCHED'));
    }
  );

  resolveStoryReport = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TStoryReportParamsInput;
        Body: TResolveStoryReportInput;
      }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const result = await this.reportService.resolveStoryReport(
        request.params.storySlug,
        request.params.reportId,
        reviewerId,
        request.body
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Story report resolved.', 'UPDATED'));
    }
  );

  banUserFromStory = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TStorySlugParamsInput;
        Body: TBanUserFromStoryInput;
      }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const result = await this.reportService.banUserFromStory(
        request.params.storySlug,
        reviewerId,
        request.body
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'User banned from story.', 'CREATED'));
    }
  );

  unbanUserFromStory = catchAsync(
    async (request: FastifyRequest<{ Params: TStoryUserBanParamsInput }>, reply: FastifyReply) => {
      const result = await this.reportService.unbanUserFromStory(
        request.params.storySlug,
        request.params.userId
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'User unbanned from story.', 'DELETED'));
    }
  );

  // ═══════════════════════════════════════════
  // PLATFORM-LEVEL MODERATION ENDPOINTS
  // ═══════════════════════════════════════════

  getAdminReports = catchAsync(
    async (
      request: FastifyRequest<{ Querystring: TPaginatedReportQueryParamsInput }>,
      reply: FastifyReply
    ) => {
      const result = await this.reportService.getAllAdminReports(request.query);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(result, 'OK', 'All admin reports retrieved successfully.', 'FETCHED')
        );
    }
  );

  getAdminReportById = catchAsync(
    async (request: FastifyRequest<{ Params: TReportIdParamsInput }>, reply: FastifyReply) => {
      const result = await this.reportService.getAdminReportById(request.params.reportId);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Admin report details retrieved.', 'FETCHED'));
    }
  );

  updateReportStatus = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TReportIdParamsInput;
        Body: TUpdateReportStatusInput;
      }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const result = await this.reportService.updateReportStatus(
        request.params.reportId,
        reviewerId,
        request.body
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'Report status updated.', 'UPDATED'));
    }
  );

  resolveAdminReport = catchAsync(
    async (
      request: FastifyRequest<{
        Params: TReportIdParamsInput;
        Body: TPlatformResolveReportInput;
      }>,
      reply: FastifyReply
    ) => {
      const reviewerId = request.user.clerkId;
      const result = await this.reportService.resolveAdminReport(
        request.params.reportId,
        reviewerId,
        request.body
      );

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(
          ApiResponse.success(result, 'OK', 'Report resolved globally successfully.', 'UPDATED')
        );
    }
  );

  banUserGlobally = catchAsync(
    async (request: FastifyRequest<{ Body: TPlatformBanUserInput }>, reply: FastifyReply) => {
      const reviewerId = request.user.clerkId;
      const result = await this.reportService.banUserGlobally(reviewerId, request.body);

      return reply
        .code(HTTP_STATUS.OK.code)
        .send(ApiResponse.success(result, 'OK', 'User banned globally successfully.', 'CREATED'));
    }
  );
}
