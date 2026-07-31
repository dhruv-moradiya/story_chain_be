import { BaseRepository } from '@/utils/baseClass';
import { singleton } from 'tsyringe';
import {
  IReport,
  IReportDoc,
  IPopulatedReportDetails,
  TReportReason,
  TReportStatus,
  TReportType,
} from '../types/report.types';
import { Report } from '@/models/report.model';
import { FilterQuery } from 'mongoose';
import { ReportPipelineBuilder } from '../pipeline/reportPipeline.builder';
import { ReportGovernanceLevel } from '../types/report-enum';

export interface IPaginatedReportsResult {
  reports: IReport[];
  totalDocs: number;
  totalPages: number;
  page: number;
  limit: number;
}

@singleton()
export class ReportRepository extends BaseRepository<IReport, IReportDoc> {
  constructor() {
    super(Report);
  }

  async createReport(data: Partial<IReport>): Promise<IReport> {
    return this.create({ data });
  }

  async findReportById(reportId: string): Promise<IReport | null> {
    return this.findById({ id: reportId });
  }

  async findReportDetailsWithPipeline(reportId: string): Promise<IPopulatedReportDetails | null> {
    const builder = new ReportPipelineBuilder().getReportDetailsPreset(reportId);
    const results = await this.model.aggregate<IPopulatedReportDetails>(builder.build()).exec();
    return results.length > 0 ? results[0] : null;
  }

  async findUserReportDetailsWithPipeline(
    reporterId: string,
    reportId: string
  ): Promise<IPopulatedReportDetails | null> {
    const builder = new ReportPipelineBuilder().getUserReportDetailsPreset(reportId, reporterId);
    const results = await this.model.aggregate<IPopulatedReportDetails>(builder.build()).exec();
    return results.length > 0 ? results[0] : null;
  }

  async findUserReports(
    reporterId: string,
    options: { page: number; limit: number; status?: string }
  ): Promise<IPaginatedReportsResult> {
    const { page = 1, limit = 10, status } = options;

    const filter: FilterQuery<IReportDoc> = { reporterId };
    if (status) {
      filter.status = status;
    }

    const builder = new ReportPipelineBuilder().getUserReportsPreset(reporterId, {
      page,
      limit,
      status: status as TReportStatus,
    });

    const [reports, totalDocs] = await Promise.all([
      this.model.aggregate<IReport>(builder.build()).exec(),
      this.count({ filter }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      reports,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findStoryReports(
    storySlug: string,
    options: { page: number; limit: number; status?: string }
  ): Promise<IPaginatedReportsResult> {
    const { page = 1, limit = 10, status } = options;

    const filter: FilterQuery<IReportDoc> = { relatedStorySlug: storySlug };
    if (status) {
      filter.status = status;
    }

    const builder = new ReportPipelineBuilder().getStoryReportsPreset(storySlug, {
      page,
      limit,
      status: status as TReportStatus,
    });

    const [reports, totalDocs] = await Promise.all([
      this.model.aggregate<IReport>(builder.build()).exec(),
      this.count({ filter }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      reports,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findAllReports(options: {
    page: number;
    limit: number;
    status?: string;
    reportType?: string;
    reason?: string;
    governanceLevel?: string;
  }): Promise<IPaginatedReportsResult> {
    const { page = 1, limit = 10, status, reportType, reason, governanceLevel } = options;

    const filter: FilterQuery<IReportDoc> = {};
    if (status) filter.status = status;
    if (reportType) filter.reportType = reportType;
    if (reason) filter.reason = reason;
    if (governanceLevel) filter.governanceLevel = governanceLevel;

    const builder = new ReportPipelineBuilder().getAdminReportsPreset({
      page,
      limit,
      status: status as TReportStatus,
      reportType: reportType as TReportType,
      reason: reason as TReportReason,
      governanceLevel: governanceLevel as ReportGovernanceLevel,
    });

    const [reports, totalDocs] = await Promise.all([
      this.model.aggregate<IReport>(builder.build()).exec(),
      this.count({ filter }),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      reports,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async getReportStats(
    groupBy: 'status' | 'reason' | 'reportType' | 'governanceLevel'
  ): Promise<Array<{ _id: string; count: number }>> {
    const builder = new ReportPipelineBuilder();
    switch (groupBy) {
      case 'status':
        builder.groupStatsByStatus();
        break;
      case 'reason':
        builder.groupStatsByReason();
        break;
      case 'reportType':
        builder.groupStatsByType();
        break;
      case 'governanceLevel':
        builder.groupStatsByGovernanceLevel();
        break;
    }
    return this.model.aggregate<{ _id: string; count: number }>(builder.build()).exec();
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    openedBy: string
  ): Promise<IReport | null> {
    return this.findOneAndUpdate({
      filter: { _id: reportId },
      update: {
        status,
        openedBy,
        openedAt: new Date(),
      },
    });
  }

  async resolveReport(
    reportId: string,
    payload: { status: string; resolution: string; resolvedBy: string }
  ): Promise<IReport | null> {
    return this.findOneAndUpdate({
      filter: { _id: reportId },
      update: {
        status: payload.status,
        resolution: payload.resolution,
        resolvedBy: payload.resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async existsReport(filter: FilterQuery<IReportDoc>): Promise<boolean> {
    return Boolean(await this.model.exists(filter));
  }
}
