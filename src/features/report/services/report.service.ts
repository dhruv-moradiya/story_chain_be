import { inject, singleton } from 'tsyringe';
import { TOKENS } from '@container/tokens';
import { BaseModule } from '@utils/baseClass';
import { AppError } from '@infrastructure/errors/app-error';
import { UserService } from '@features/user/services/user.service';
import { ReportRepository } from '../repositories/report.repository';
import {
  IReport,
  IReportDoc,
  IReportPaginatedResponse,
  IPopulatedReportDetails,
} from '../types/report.types';
import { formatPaginatedResponse } from '@/utils/helpter';
import { ReportStatus, ReportGovernanceLevel, ReportType } from '../types/report-enum';
import {
  TBanUserFromStoryInput,
  TCreateReportInput,
  TPaginatedReportQueryParamsInput,
  TPlatformBanUserInput,
  TPlatformResolveReportInput,
  TResolveStoryReportInput,
  TUpdateReportStatusInput,
} from '@/schema/request/report.schema';
import { FilterQuery } from 'mongoose';

@singleton()
export class ReportService extends BaseModule {
  constructor(
    @inject(TOKENS.ReportRepository)
    private readonly reportRepository: ReportRepository,
    @inject(TOKENS.UserService)
    private readonly userService: UserService
  ) {
    super();
  }

  async createReport(reporterId: string, input: TCreateReportInput): Promise<IReport> {
    const isPlatformReport =
      input.reportType === ReportType.STORY || input.reportType === ReportType.USER;

    const reportData: Partial<IReport> = {
      reporterId,
      reportType: input.reportType,
      reason: input.reason,
      description: input.description,
      status: ReportStatus.PENDING,
      governanceLevel: isPlatformReport
        ? ReportGovernanceLevel.PLATFORM
        : ReportGovernanceLevel.STORY,
    };

    const duplicateCheckFilter: FilterQuery<IReportDoc> = {
      reporterId,
      reportType: input.reportType,
      status: {
        $in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW, ReportStatus.ESCALATED],
      },
    };

    switch (input.reportType) {
      case ReportType.CHAPTER:
        reportData.relatedStorySlug = input.relatedStorySlug;
        reportData.relatedChapterSlug = input.relatedChapterSlug;

        duplicateCheckFilter.relatedChapterSlug = input.relatedChapterSlug;
        break;

      case ReportType.COMMENT:
        reportData.relatedStorySlug = input.relatedStorySlug;
        reportData.relatedChapterSlug = input.relatedChapterSlug;
        reportData.relatedCommentId = input.relatedCommentId;

        duplicateCheckFilter.relatedCommentId = input.relatedCommentId;
        break;

      case ReportType.USER:
        reportData.relatedUserId = input.relatedUserId;

        duplicateCheckFilter.relatedUserId = input.relatedUserId;
        break;

      case ReportType.STORY:
        reportData.relatedStorySlug = input.relatedStorySlug;

        duplicateCheckFilter.relatedStorySlug = input.relatedStorySlug;
        break;
    }

    if (await this.reportRepository.existsReport(duplicateCheckFilter)) {
      this.throwConflictError('ALREADY_REPORTED', 'You have already reported this.');
    }

    return this.reportRepository.createReport(reportData);
  }

  async getUserReports(
    reporterId: string,
    query: TPaginatedReportQueryParamsInput
  ): Promise<IReportPaginatedResponse> {
    const { page = 1, limit = 10, status } = query;
    const { reports, totalDocs } = await this.reportRepository.findUserReports(reporterId, {
      page,
      limit,
      status,
    });

    return formatPaginatedResponse(reports, totalDocs, page, limit);
  }

  async getUserReportById(reporterId: string, reportId: string): Promise<IPopulatedReportDetails> {
    // Condition 1: Check report existence
    const rawReport = await this.reportRepository.findReportById(reportId);
    if (!rawReport) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    // Condition 2: Check reporter ownership permission
    if (rawReport.reporterId !== reporterId) {
      throw AppError.forbidden('FORBIDDEN', 'You do not have permission to view this report.');
    }

    // Condition 3: Fetch fully populated report using pipeline builder preset
    const populatedReport = await this.reportRepository.findUserReportDetailsWithPipeline(
      reporterId,
      reportId
    );

    if (!populatedReport) {
      throw AppError.notFound('NOT_FOUND', 'Report details not found.');
    }

    // Condition 4: Diff status handling & logging
    switch (populatedReport.status) {
      case ReportStatus.PENDING:
        this.logInfo('User accessed pending report details', { reportId, reporterId });
        break;

      case ReportStatus.UNDER_REVIEW:
        this.logInfo('User accessed under-review report details', { reportId, reporterId });
        break;

      case ReportStatus.RESOLVED:
      case ReportStatus.DISMISSED:
        this.logInfo('User accessed resolved/dismissed report details', {
          reportId,
          reporterId,
          resolution: populatedReport.resolution,
        });
        break;

      case ReportStatus.ESCALATED:
        this.logInfo('User accessed escalated report details', { reportId, reporterId });
        break;
    }

    return populatedReport;
  }

  async getStoryReports(
    storySlug: string,
    query: TPaginatedReportQueryParamsInput
  ): Promise<IReportPaginatedResponse> {
    const { page = 1, limit = 10, status } = query;
    const { reports, totalDocs } = await this.reportRepository.findStoryReports(storySlug, {
      page,
      limit,
      status,
    });

    return formatPaginatedResponse(reports, totalDocs, page, limit);
  }

  async resolveStoryReport(
    storySlug: string,
    reportId: string,
    reviewerId: string,
    input: TResolveStoryReportInput
  ): Promise<IReport> {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    if (report.relatedStorySlug && report.relatedStorySlug !== storySlug) {
      throw new AppError('INVALID_INPUT', 400, {
        message: 'Report does not belong to this story.',
      });
    }

    const updated = await this.reportRepository.resolveReport(reportId, {
      status: input.status,
      resolution: input.resolution,
      resolvedBy: reviewerId,
    });

    if (!updated) {
      throw AppError.notFound('NOT_FOUND', 'Report could not be updated.');
    }

    return updated;
  }

  async banUserFromStory(
    storySlug: string,
    reviewerId: string,
    input: TBanUserFromStoryInput
  ): Promise<{ message: string; storySlug: string; bannedUserId: string }> {
    this.logInfo('User banned from story', {
      storySlug,
      reviewerId,
      bannedUserId: input.userId,
      reason: input.reason,
    });

    return {
      message: `User ${input.userId} has been banned from story ${storySlug}.`,
      storySlug,
      bannedUserId: input.userId,
    };
  }

  async unbanUserFromStory(
    storySlug: string,
    userId: string
  ): Promise<{ message: string; storySlug: string; unbannedUserId: string }> {
    this.logInfo('User unbanned from story', { storySlug, unbannedUserId: userId });

    return {
      message: `User ${userId} has been unbanned from story ${storySlug}.`,
      storySlug,
      unbannedUserId: userId,
    };
  }

  async getAllAdminReports(
    query: TPaginatedReportQueryParamsInput
  ): Promise<IReportPaginatedResponse> {
    const { page = 1, limit = 10, status, report_type, reason } = query;
    const { reports, totalDocs } = await this.reportRepository.findAllReports({
      page,
      limit,
      status,
      reportType: report_type,
      reason,
    });

    return formatPaginatedResponse(reports, totalDocs, page, limit);
  }

  async getAdminReportById(reportId: string): Promise<IPopulatedReportDetails> {
    const report = await this.reportRepository.findReportDetailsWithPipeline(reportId);
    if (!report) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    return report;
  }

  async updateReportStatus(
    reportId: string,
    reviewerId: string,
    input: TUpdateReportStatusInput
  ): Promise<IReport> {
    const updated = await this.reportRepository.updateReportStatus(
      reportId,
      input.status,
      reviewerId
    );

    if (!updated) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    return updated;
  }

  async resolveAdminReport(
    reportId: string,
    reviewerId: string,
    input: TPlatformResolveReportInput
  ): Promise<IReport> {
    const updated = await this.reportRepository.resolveReport(reportId, {
      status: ReportStatus.RESOLVED,
      resolution: input.resolution,
      resolvedBy: reviewerId,
    });

    if (!updated) {
      throw AppError.notFound('NOT_FOUND', 'Report not found.');
    }

    return updated;
  }

  async banUserGlobally(
    reviewerId: string,
    input: TPlatformBanUserInput
  ): Promise<{ message: string; bannedUserId: string }> {
    this.logInfo('User banned globally', {
      reviewerId,
      bannedUserId: input.userId,
      reason: input.reason,
      durationDays: input.durationDays,
    });

    await this.userService.banUser({
      userId: input.userId,
      reviewerId,
      reason: input.reason,
      durationDays: input.durationDays,
    });

    return {
      message: `User ${input.userId} has been banned globally.`,
      bannedUserId: input.userId,
    };
  }

  async unbanUserGlobally(
    reviewerId: string,
    userId: string,
    reason?: string
  ): Promise<{ message: string; unbannedUserId: string }> {
    this.logInfo('User unbanned globally', { reviewerId, unbannedUserId: userId, reason });

    await this.userService.unbanUser({
      userId,
      reviewerId,
      reason,
    });

    return {
      message: `User ${userId} has been unbanned globally.`,
      unbannedUserId: userId,
    };
  }
}
